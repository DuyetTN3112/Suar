#!/usr/bin/env node
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { extname, join, relative, resolve } from 'node:path'

import ts from 'typescript'

const ROOT = resolve(import.meta.dirname, '..')

/**
 * Transitional ratchet. Existing generic 400 exceptions are migration debt:
 * modules may reduce these counts, but must not add new instances. Once a
 * module reaches zero, remove its budget entry so any reintroduction fails.
 */
const BUSINESS_LOGIC_EXCEPTION_BUDGET_BY_MODULE = new Map([
  // Feature-local BaseCommand copies preserve behavior but are counted as
  // separate syntax occurrences by this physical-source ratchet.
  ['admin', 12],
  ['auth', 3],
  ['authorization', 1],
  ['errors', 5],
  ['http', 8],
  ['organizations', 31],
  ['projects', 11],
  ['reviews', 66],
  ['settings', 2],
  ['skills', 5],
  ['sprints', 1],
  ['tasks', 35],
  ['users', 9],
])

function walk(directory) {
  const files = []
  for (const entry of readdirSync(directory)) {
    const absolute = join(directory, entry)
    const stat = statSync(absolute)
    if (stat.isDirectory()) {
      files.push(...walk(absolute))
    } else {
      files.push(absolute)
    }
  }
  return files
}

function lineNumber(content, offset) {
  return content.slice(0, offset).split('\n').length
}

function isTransactionRollbackCall(node) {
  return (
    ts.isCallExpression(node) &&
    node.arguments.length === 0 &&
    ts.isPropertyAccessExpression(node.expression) &&
    node.expression.name.text === 'rollback'
  )
}

function isTransactionCommitCall(node) {
  return (
    ts.isCallExpression(node) &&
    ts.isPropertyAccessExpression(node.expression) &&
    ts.isIdentifier(node.expression.expression) &&
    node.expression.expression.text === 'trx' &&
    node.expression.name.text === 'commit'
  )
}

function isAuditWriteCall(node) {
  return (
    ts.isCallExpression(node) &&
    ts.isPropertyAccessExpression(node.expression) &&
    ts.isIdentifier(node.expression.expression) &&
    node.expression.expression.text === 'auditPublicApi' &&
    (node.expression.name.text === 'write' || node.expression.name.text === 'log')
  )
}

function isTransactionalAuditPublicWriteCall(node) {
  return (
    ts.isCallExpression(node) &&
    ts.isPropertyAccessExpression(node.expression) &&
    ts.isIdentifier(node.expression.expression) &&
    node.expression.expression.text === 'auditPublicApi' &&
    node.expression.name.text === 'write' &&
    hasTransactionArgument(node)
  )
}

function hasLiteralCriticalAuditFlag(node) {
  const input = node.arguments[1]
  if (!input || !ts.isObjectLiteralExpression(input)) {
    return false
  }

  return input.properties.some(
    (property) =>
      ts.isPropertyAssignment(property) &&
      ((ts.isIdentifier(property.name) && property.name.text === 'critical') ||
        (ts.isStringLiteral(property.name) && property.name.text === 'critical')) &&
      property.initializer.kind === ts.SyntaxKind.TrueKeyword
  )
}

function isAuditHelperCall(node) {
  if (
    !ts.isCallExpression(node) ||
    !ts.isPropertyAccessExpression(node.expression) ||
    node.expression.expression.kind !== ts.SyntaxKind.ThisKeyword ||
    !/audit/i.test(node.expression.name.text)
  ) {
    return false
  }
  return true
}

function hasTransactionArgument(node) {
  return node.arguments.some((argument) => {
    if (ts.isIdentifier(argument)) {
      return argument.text === 'trx'
    }

    if (!ts.isObjectLiteralExpression(argument)) {
      return false
    }

    return argument.properties.some((property) => {
      if (ts.isShorthandPropertyAssignment(property)) {
        return property.name.text === 'trx'
      }

      return (
        ts.isPropertyAssignment(property) &&
        ((ts.isIdentifier(property.name) && property.name.text === 'trx') ||
          (ts.isStringLiteral(property.name) && property.name.text === 'trx'))
      )
    })
  })
}

function containsTransactionCommit(node) {
  if (isTransactionCommitCall(node)) {
    return true
  }

  let found = false
  ts.forEachChild(node, (child) => {
    if (!found && containsTransactionCommit(child)) {
      found = true
    }
  })
  return found
}

function followsTransactionCommitInBlock(node) {
  let statement = node
  while (statement.parent && !ts.isBlock(statement.parent)) {
    statement = statement.parent
  }
  if (!statement.parent || !ts.isBlock(statement.parent)) {
    return false
  }

  const statementIndex = statement.parent.statements.indexOf(statement)
  return statement.parent.statements
    .slice(0, statementIndex)
    .some((candidate) => containsTransactionCommit(candidate))
}

function isInsideTransactionCallback(node) {
  let ancestor = node.parent

  while (ancestor) {
    if (
      (ts.isArrowFunction(ancestor) ||
        ts.isFunctionExpression(ancestor) ||
        ts.isMethodDeclaration(ancestor) ||
        ts.isFunctionDeclaration(ancestor)) &&
      ancestor.parameters.some(
        (parameter) => ts.isIdentifier(parameter.name) && parameter.name.text === 'trx'
      )
    ) {
      return true
    }
    ancestor = ancestor.parent
  }

  return false
}

function isFloatingEmitterCall(node, usesAdonisEmitter) {
  return (
    usesAdonisEmitter &&
    ts.isCallExpression(node) &&
    ts.isPropertyAccessExpression(node.expression) &&
    ts.isIdentifier(node.expression.expression) &&
    node.expression.expression.text === 'emitter' &&
    node.expression.name.text === 'emit' &&
    (ts.isVoidExpression(node.parent) || ts.isExpressionStatement(node.parent))
  )
}

function isManagedTransactionCall(node) {
  if (!ts.isCallExpression(node)) {
    return false
  }

  if (ts.isIdentifier(node.expression)) {
    return node.expression.text === 'executeInTransaction'
  }

  if (!ts.isPropertyAccessExpression(node.expression)) {
    return false
  }

  return (
    node.expression.name.text === 'executeInTransaction' ||
    (ts.isIdentifier(node.expression.expression) &&
      node.expression.expression.text === 'db' &&
      node.expression.name.text === 'transaction')
  )
}

function containsCommittedMutationBoundary(node) {
  if (isTransactionCommitCall(node) || isManagedTransactionCall(node)) {
    return true
  }

  let found = false
  ts.forEachChild(node, (child) => {
    if (!found && containsCommittedMutationBoundary(child)) {
      found = true
    }
  })
  return found
}

function followsCommittedMutationBoundaryInBlock(node) {
  let statement = node
  while (statement.parent && !ts.isBlock(statement.parent)) {
    statement = statement.parent
  }
  if (!statement.parent || !ts.isBlock(statement.parent)) {
    return false
  }

  const statementIndex = statement.parent.statements.indexOf(statement)
  return statement.parent.statements
    .slice(0, statementIndex)
    .some((candidate) => containsCommittedMutationBoundary(candidate))
}

function isCacheInvalidationCall(node, source) {
  if (!ts.isCallExpression(node) || !ts.isPropertyAccessExpression(node.expression)) {
    return false
  }

  const method = node.expression.name.text
  const receiver = node.expression.expression.getText(source).toLowerCase()
  return (
    receiver.includes('cache') &&
    (method === 'delete' ||
      method === 'deleteByPattern' ||
      method.startsWith('invalidate') ||
      /^after[A-Z].*Changed$/u.test(method))
  )
}

function isInsidePostCommitSettlement(node) {
  let ancestor = node.parent
  while (ancestor) {
    if (ts.isCallExpression(ancestor)) {
      const callee = ancestor.expression
      const name = ts.isIdentifier(callee)
        ? callee.text
        : ts.isPropertyAccessExpression(callee)
          ? callee.name.text
          : ''
      if (/^settle.*PostCommit/u.test(name)) {
        return true
      }
    }
    ancestor = ancestor.parent
  }
  return false
}

function containsCatchMessageAccess(node, catchVariable) {
  if (
    ts.isPropertyAccessExpression(node) &&
    ts.isIdentifier(node.expression) &&
    node.expression.text === catchVariable &&
    node.name.text === 'message'
  ) {
    return true
  }

  let found = false
  ts.forEachChild(node, (child) => {
    if (!found && containsCatchMessageAccess(child, catchVariable)) {
      found = true
    }
  })
  return found
}

function messageInitializerFromReturn(node) {
  if (
    !ts.isReturnStatement(node) ||
    !node.expression ||
    !ts.isObjectLiteralExpression(node.expression)
  ) {
    return null
  }

  for (const property of node.expression.properties) {
    if (
      ts.isPropertyAssignment(property) &&
      ((ts.isIdentifier(property.name) && property.name.text === 'message') ||
        (ts.isStringLiteral(property.name) && property.name.text === 'message'))
    ) {
      return property.initializer
    }
  }

  return null
}

function nearestCatchClause(node) {
  let ancestor = node.parent
  while (ancestor) {
    if (ts.isCatchClause(ancestor)) {
      return ancestor
    }
    ancestor = ancestor.parent
  }
  return null
}

function resolvesToCatchMessage(initializer, catchClause, catchVariable) {
  if (containsCatchMessageAccess(initializer, catchVariable)) {
    return true
  }
  if (!ts.isIdentifier(initializer)) {
    return false
  }

  let found = false
  const visit = (node) => {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === initializer.text &&
      node.initializer &&
      containsCatchMessageAccess(node.initializer, catchVariable)
    ) {
      found = true
      return
    }
    ts.forEachChild(node, visit)
  }
  visit(catchClause.block)
  return found
}

function isCommandLoggerCall(node) {
  return (
    ts.isCallExpression(node) &&
    ts.isPropertyAccessExpression(node.expression) &&
    (node.expression.name.text === 'error' || node.expression.name.text === 'warn') &&
    ts.isPropertyAccessExpression(node.expression.expression) &&
    node.expression.expression.expression.kind === ts.SyntaxKind.ThisKeyword &&
    node.expression.expression.name.text === 'logger'
  )
}

function containsUnsanitizedErrorDiagnostic(node) {
  if (
    ts.isCallExpression(node) &&
    ts.isIdentifier(node.expression) &&
    node.expression.text === 'sanitizeErrorLogText'
  ) {
    return false
  }

  if (
    ts.isPropertyAccessExpression(node) &&
    ts.isIdentifier(node.expression) &&
    (node.expression.text === 'error' || node.expression.text === 'err') &&
    node.name.text === 'message'
  ) {
    return true
  }

  if (
    ts.isCallExpression(node) &&
    ts.isIdentifier(node.expression) &&
    node.expression.text === 'String' &&
    node.arguments.some(
      (argument) =>
        ts.isIdentifier(argument) && (argument.text === 'error' || argument.text === 'err')
    )
  ) {
    return true
  }

  let found = false
  ts.forEachChild(node, (child) => {
    if (!found && containsUnsanitizedErrorDiagnostic(child)) {
      found = true
    }
  })
  return found
}

function isCoreLoggerCall(node, usesAdonisLogger) {
  return (
    usesAdonisLogger &&
    ts.isCallExpression(node) &&
    ts.isPropertyAccessExpression(node.expression) &&
    ts.isIdentifier(node.expression.expression) &&
    node.expression.expression.text === 'logger'
  )
}

function isApplicationLoggerCall(node) {
  return (
    ts.isCallExpression(node) &&
    ts.isPropertyAccessExpression(node.expression) &&
    (node.expression.name.text === 'error' || node.expression.name.text === 'warn') &&
    ts.isIdentifier(node.expression.expression) &&
    node.expression.expression.text === 'loggerService'
  )
}

function containsRawErrorObjectProperty(node) {
  if (!ts.isObjectLiteralExpression(node)) {
    return false
  }

  return node.properties.some((property) => {
    if (
      ts.isShorthandPropertyAssignment(property) &&
      (property.name.text === 'error' || property.name.text === 'err')
    ) {
      return true
    }

    if (!ts.isPropertyAssignment(property) || !ts.isIdentifier(property.initializer)) {
      return false
    }

    const propertyName =
      ts.isIdentifier(property.name) || ts.isStringLiteral(property.name) ? property.name.text : ''
    return (
      (propertyName === 'error' || propertyName === 'err') &&
      (property.initializer.text === 'error' || property.initializer.text === 'err')
    )
  })
}

function containsSearchCandidateCall(node) {
  if (
    ts.isCallExpression(node) &&
    ((ts.isPropertyAccessExpression(node.expression) &&
      /^search[A-Z].*Candidates$/u.test(node.expression.name.text)) ||
      (ts.isIdentifier(node.expression) && /^search[A-Z].*ViaEngine$/u.test(node.expression.text)))
  ) {
    return true
  }

  let found = false
  ts.forEachChild(node, (child) => {
    if (!found && containsSearchCandidateCall(child)) {
      found = true
    }
  })
  return found
}

function containsSearchFallbackObservation(node) {
  if (
    ts.isCallExpression(node) &&
    ts.isPropertyAccessExpression(node.expression) &&
    ts.isIdentifier(node.expression.expression) &&
    node.expression.expression.text === 'searchFallbackObserver' &&
    node.expression.name.text === 'record'
  ) {
    return true
  }

  let found = false
  ts.forEachChild(node, (child) => {
    if (!found && containsSearchFallbackObservation(child)) {
      found = true
    }
  })
  return found
}

function isRethrowOnlyCatch(catchClause) {
  return (
    catchClause.block.statements.length === 1 &&
    ts.isThrowStatement(catchClause.block.statements[0])
  )
}

function containsSchemaDriftSqlState(catchClause, source) {
  return /(?:42P01|42703)/u.test(catchClause.block.getText(source))
}

function catchEndsWithThrow(catchClause) {
  const lastStatement = catchClause.block.statements.at(-1)
  return lastStatement !== undefined && ts.isThrowStatement(lastStatement)
}

const violations = []
const businessLogicExceptionCountByModule = new Map()
const productionModuleFiles = walk(join(ROOT, 'app', 'modules')).filter((file) => {
  const normalized = file.replaceAll('\\', '/')
  return extname(file) === '.ts' && !normalized.includes('/tests/')
})
const operationalCommandFiles = walk(join(ROOT, 'commands')).filter((file) => {
  const normalized = file.replaceAll('\\', '/')
  return (
    extname(file) === '.ts' &&
    !normalized.endsWith('/seed_data.ts') &&
    !normalized.endsWith('/seed_test_accounts.ts')
  )
})
const productionExceptionFiles = [...productionModuleFiles, ...operationalCommandFiles]
const boundaryFiles = productionModuleFiles.filter((file) => {
  const normalized = file.replaceAll('\\', '/')
  return normalized.includes('/controllers/') || normalized.includes('/middleware/')
})

for (const file of productionExceptionFiles) {
  const content = readFileSync(file, 'utf8')
  const source = ts.createSourceFile(file, content, ts.ScriptTarget.Latest, true)
  const isCacheModule = file.replaceAll('\\', '/').includes('/modules/cache/')
  const isCacheOwnedFile =
    isCacheModule || /(?:^|[/_])cache(?:[/_.]|$)/u.test(file.replaceAll('\\', '/'))
  const isListenerModule = file.replaceAll('\\', '/').includes('/listeners/')
  const isOperationalCommand = file.replaceAll('\\', '/').includes('/commands/')
  const isRollbackPreservingContract = file
    .replaceAll('\\', '/')
    .endsWith('/modules/logger/public_contracts/transaction_rollback.ts')
  const usesAdonisEmitter = source.statements.some(
    (statement) =>
      ts.isImportDeclaration(statement) &&
      ts.isStringLiteral(statement.moduleSpecifier) &&
      statement.moduleSpecifier.text === '@adonisjs/core/services/emitter'
  )
  const usesAdonisLogger = source.statements.some(
    (statement) =>
      ts.isImportDeclaration(statement) &&
      ts.isStringLiteral(statement.moduleSpecifier) &&
      statement.moduleSpecifier.text === '@adonisjs/core/services/logger'
  )
  const visit = (node) => {
    if (
      ts.isThrowStatement(node) &&
      node.expression &&
      ts.isNewExpression(node.expression) &&
      ts.isIdentifier(node.expression.expression) &&
      node.expression.expression.text === 'Error'
    ) {
      const position = source.getLineAndCharacterOfPosition(node.getStart(source))
      violations.push({
        file: relative(ROOT, file),
        line: position.line + 1,
        rule: 'raw-generic-error',
        reason:
          'production modules must use a typed exception that preserves classification and reporting semantics',
      })
    }
    if (
      ts.isNewExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'BusinessLogicException'
    ) {
      const moduleName = relative(ROOT, file).replaceAll('\\', '/').split('/')[2]
      if (moduleName) {
        businessLogicExceptionCountByModule.set(
          moduleName,
          (businessLogicExceptionCountByModule.get(moduleName) ?? 0) + 1
        )
      }
    }
    if (isTransactionRollbackCall(node) && !isRollbackPreservingContract) {
      const position = source.getLineAndCharacterOfPosition(node.getStart(source))
      violations.push({
        file: relative(ROOT, file),
        line: position.line + 1,
        rule: 'rollback-can-mask-original-error',
        reason:
          'manual rollback must use the rollback-preserving contract so secondary failures cannot replace the original exception',
      })
    }
    if (isAuditWriteCall(node) && followsTransactionCommitInBlock(node)) {
      const position = source.getLineAndCharacterOfPosition(node.getStart(source))
      violations.push({
        file: relative(ROOT, file),
        line: position.line + 1,
        rule: 'post-commit-audit-write',
        reason:
          'required audit writes must share the business transaction instead of failing after commit',
      })
    }
    if (isAuditWriteCall(node) && isInsideTransactionCallback(node) && node.arguments.length < 3) {
      const position = source.getLineAndCharacterOfPosition(node.getStart(source))
      violations.push({
        file: relative(ROOT, file),
        line: position.line + 1,
        rule: 'nontransactional-audit-write',
        reason:
          'audit writes inside a business transaction must receive the same transaction client',
      })
    }
    if (isTransactionalAuditPublicWriteCall(node) && !hasLiteralCriticalAuditFlag(node)) {
      const position = source.getLineAndCharacterOfPosition(node.getStart(source))
      violations.push({
        file: relative(ROOT, file),
        line: position.line + 1,
        rule: 'noncritical-transactional-audit-write',
        reason:
          'business audit writes sharing a transaction must set literal critical: true so persistence failure rolls back the mutation',
      })
    }
    if (
      isAuditHelperCall(node) &&
      isInsideTransactionCallback(node) &&
      !hasTransactionArgument(node)
    ) {
      const position = source.getLineAndCharacterOfPosition(node.getStart(source))
      violations.push({
        file: relative(ROOT, file),
        line: position.line + 1,
        rule: 'nontransactional-audit-helper-call',
        reason:
          'audit helpers called inside a business transaction must receive the same transaction client',
      })
    }
    if (isFloatingEmitterCall(node, usesAdonisEmitter)) {
      const position = source.getLineAndCharacterOfPosition(node.getStart(source))
      violations.push({
        file: relative(ROOT, file),
        line: position.line + 1,
        rule: 'floating-event-promise',
        reason:
          'event promises must be awaited or explicitly settled so listener rejections are observed',
      })
    }
    if (
      isCacheInvalidationCall(node, source) &&
      followsCommittedMutationBoundaryInBlock(node) &&
      !isInsidePostCommitSettlement(node)
    ) {
      const position = source.getLineAndCharacterOfPosition(node.getStart(source))
      violations.push({
        file: relative(ROOT, file),
        line: position.line + 1,
        rule: 'unsettled-post-commit-cache-effect',
        reason:
          'cache invalidation after commit must be settled so an outage cannot turn committed success into a client failure',
      })
    }
    if (
      isOperationalCommand &&
      isCommandLoggerCall(node) &&
      node.arguments.some(containsUnsanitizedErrorDiagnostic)
    ) {
      const position = source.getLineAndCharacterOfPosition(node.getStart(source))
      violations.push({
        file: relative(ROOT, file),
        line: position.line + 1,
        rule: 'unsanitized-command-diagnostic-log',
        reason:
          'operational commands must sanitize dependency diagnostics before writing a log line',
      })
    }
    if (
      isCoreLoggerCall(node, usesAdonisLogger) &&
      node.arguments.some(containsRawErrorObjectProperty)
    ) {
      const position = source.getLineAndCharacterOfPosition(node.getStart(source))
      violations.push({
        file: relative(ROOT, file),
        line: position.line + 1,
        rule: 'raw-error-object-log',
        reason:
          'raw Error objects include stack and dependency diagnostics; serialize a bounded redacted envelope before logging',
      })
    }
    if (
      !isCacheOwnedFile &&
      isApplicationLoggerCall(node) &&
      node.arguments.some(containsUnsanitizedErrorDiagnostic)
    ) {
      const position = source.getLineAndCharacterOfPosition(node.getStart(source))
      violations.push({
        file: relative(ROOT, file),
        line: position.line + 1,
        rule: 'unsanitized-logger-service-diagnostic',
        reason:
          'loggerService must receive a bounded redacted error envelope instead of raw dependency diagnostics',
      })
    }
    if (
      !isCacheOwnedFile &&
      isApplicationLoggerCall(node) &&
      node.arguments.some(
        (argument) =>
          (ts.isIdentifier(argument) && (argument.text === 'error' || argument.text === 'err')) ||
          containsRawErrorObjectProperty(argument)
      )
    ) {
      const position = source.getLineAndCharacterOfPosition(node.getStart(source))
      violations.push({
        file: relative(ROOT, file),
        line: position.line + 1,
        rule: 'raw-logger-service-error',
        reason:
          'raw Error objects include stack and dependency diagnostics; serialize a bounded redacted envelope before passing them to loggerService',
      })
    }
    if (
      ts.isCatchClause(node) &&
      ts.isTryStatement(node.parent) &&
      containsSearchCandidateCall(node.parent.tryBlock) &&
      !isRethrowOnlyCatch(node) &&
      !containsSearchFallbackObservation(node.block)
    ) {
      const position = source.getLineAndCharacterOfPosition(node.getStart(source))
      violations.push({
        file: relative(ROOT, file),
        line: position.line + 1,
        rule: 'silent-search-dependency-fallback',
        reason:
          'search dependency failures that degrade to a fallback must emit a bounded operational observation',
      })
    }
    if (
      ts.isCatchClause(node) &&
      !isCacheModule &&
      containsSchemaDriftSqlState(node, source) &&
      !catchEndsWithThrow(node)
    ) {
      const position = source.getLineAndCharacterOfPosition(node.getStart(source))
      violations.push({
        file: relative(ROOT, file),
        line: position.line + 1,
        rule: 'schema-drift-fail-open',
        reason:
          'missing PostgreSQL tables or columns must fail closed; deploy-time schema drift cannot be treated as successful business execution',
      })
    }
    if (
      ts.isCatchClause(node) &&
      node.variableDeclaration !== undefined &&
      isListenerModule &&
      !isCacheModule &&
      !catchEndsWithThrow(node)
    ) {
      const position = source.getLineAndCharacterOfPosition(node.getStart(source))
      violations.push({
        file: relative(ROOT, file),
        line: position.line + 1,
        rule: 'silent-listener-failure',
        reason:
          'event listeners must reject after observing a processing failure so the publisher settlement boundary can record incomplete side effects',
      })
    }
    const messageInitializer = messageInitializerFromReturn(node)
    const catchClause = messageInitializer ? nearestCatchClause(node) : null
    const catchVariable =
      catchClause?.variableDeclaration && ts.isIdentifier(catchClause.variableDeclaration.name)
        ? catchClause.variableDeclaration.name.text
        : null
    if (
      messageInitializer &&
      catchClause &&
      catchVariable &&
      resolvesToCatchMessage(messageInitializer, catchClause, catchVariable)
    ) {
      const position = source.getLineAndCharacterOfPosition(node.getStart(source))
      violations.push({
        file: relative(ROOT, file),
        line: position.line + 1,
        rule: 'catch-message-result-leak',
        reason: 'unknown exception messages must not be returned in command/query result envelopes',
      })
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
}

for (const [moduleName, count] of businessLogicExceptionCountByModule) {
  const budget = BUSINESS_LOGIC_EXCEPTION_BUDGET_BY_MODULE.get(moduleName) ?? 0
  if (count > budget) {
    violations.push({
      file: `app/modules/${moduleName}`,
      line: 1,
      rule: 'generic-business-exception-budget',
      reason: `generic BusinessLogicException count ${String(count)} exceeds the transitional module budget ${String(budget)}; use a semantic exception or reduce the baseline`,
    })
  }
}

const boundaryRules = [
  {
    id: 'untrusted-status-duck-typing',
    pattern: /['"]status['"]\s+in\s+error|error\s+as\s+\{\s*status\??:/g,
    reason: 'plain objects must not control HTTP status decisions',
  },
  {
    id: 'unknown-error-message-to-session',
    pattern: /session\.flash\s*\(\s*['"]error['"]\s*,\s*(?:error|err)\.message/g,
    reason: 'unknown exception messages must not be reflected into HTML responses',
    controllersOnly: true,
  },
  {
    id: 'unknown-error-message-extraction',
    pattern: /(?:error|err)\s+instanceof\s+Error\s*\?\s*(?:error|err)\.message/g,
    reason: 'HTTP boundaries must not classify or expose unknown failures by message text',
    controllersOnly: true,
  },
]

for (const file of boundaryFiles) {
  const content = readFileSync(file, 'utf8')
  const isController = file.replaceAll('\\', '/').includes('/controllers/')
  for (const rule of boundaryRules) {
    if (rule.controllersOnly && !isController) {
      continue
    }
    for (const match of content.matchAll(rule.pattern)) {
      violations.push({
        file: relative(ROOT, file),
        line: lineNumber(content, match.index ?? 0),
        rule: rule.id,
        reason: rule.reason,
      })
    }
  }
}

const serverErrorPages = [
  'inertia/apps/user/modules/errors/server_error.svelte',
  'inertia/apps/org/modules/errors/server_error.svelte',
  'inertia/apps/admin/modules/errors/server_error.svelte',
]
for (const relativePath of serverErrorPages) {
  const file = join(ROOT, relativePath)
  const content = readFileSync(file, 'utf8')
  const forbidden = /export\s+let\s+(?:message|name|stack)\b|\{@html\s+(?:message|stack)\}/g
  for (const match of content.matchAll(forbidden)) {
    violations.push({
      file: relativePath,
      line: lineNumber(content, match.index ?? 0),
      rule: 'server-error-diagnostic-prop',
      reason: '500 pages may receive only a safe request reference, never exception diagnostics',
    })
  }
}

const kernelPath = join(ROOT, 'start', 'kernel.ts')
const kernel = readFileSync(kernelPath, 'utf8')
const kernelSignalRule = /process\.(?:on|once)\s*\(\s*['"]SIG|process\.exit\s*\(/g
for (const match of kernel.matchAll(kernelSignalRule)) {
  violations.push({
    file: 'start/kernel.ts',
    line: lineNumber(kernel, match.index ?? 0),
    rule: 'duplicate-process-lifecycle-owner',
    reason: 'the framework lifecycle must be the sole HTTP process shutdown owner',
  })
}

if (violations.length > 0) {
  console.error('[exception-boundary][ERROR] Detected exception boundary violations:')
  for (const violation of violations) {
    console.error(
      `${violation.file}:${String(violation.line)} -> ${violation.rule} (${violation.reason})`
    )
  }
  process.exit(1)
}

console.log(
  `[exception-boundary][OK] Checked ${String(
    productionExceptionFiles.length
  )} production modules/commands and ${String(boundaryFiles.length)} HTTP boundary files`
)
console.log('[exception-boundary] PASSED')
