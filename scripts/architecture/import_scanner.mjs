#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path'
import { pathToFileURL } from 'node:url'

import ts from 'typescript'

const DEFAULT_ROOTS = ['app/modules', 'start']
const MODULE_ROOT = resolve('app/modules')
const SEMANTIC_LAYERS = new Set([
  'actions',
  'application',
  'bootstrap',
  'controllers',
  'domain',
  'infra',
  'listeners',
  'middleware',
  'observability',
  'public_contracts',
  'services',
  'support',
  'validators',
])

function toRepositoryPath(path) {
  return relative(process.cwd(), path).split(sep).join('/')
}

function shouldExclude(path, excludedSegments) {
  const normalized = `/${path.replaceAll('\\', '/')}/`
  return excludedSegments.some((segment) => normalized.includes(segment))
}

function enumerateDirectory(directory, excludedSegments, files) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name)
    const repositoryPath = toRepositoryPath(path)

    if (shouldExclude(repositoryPath, excludedSegments)) {
      continue
    }

    if (entry.isDirectory()) {
      enumerateDirectory(path, excludedSegments, files)
      continue
    }

    if (entry.isFile() && (path.endsWith('.ts') || path.endsWith('.tsx'))) {
      files.push(repositoryPath)
    }
  }
}

export function enumerateTypeScriptFiles(roots, { excludedSegments = [] } = {}) {
  const files = []

  for (const root of roots) {
    const absoluteRoot = resolve(root)
    if (!existsSync(absoluteRoot)) {
      throw new Error(`Architecture scan root does not exist: ${root}`)
    }

    const repositoryPath = toRepositoryPath(absoluteRoot)
    if (shouldExclude(repositoryPath, excludedSegments)) {
      continue
    }

    if (statSync(absoluteRoot).isDirectory()) {
      enumerateDirectory(absoluteRoot, excludedSegments, files)
      continue
    }

    if (absoluteRoot.endsWith('.ts') || absoluteRoot.endsWith('.tsx')) {
      files.push(repositoryPath)
    }
  }

  return [...new Set(files)].sort()
}

function moduleNameFromPath(path) {
  const match = /^app\/modules\/([^/]+)(?:\/|$)/.exec(path)
  if (match) {
    return match[1]
  }

  const [topLevelDirectory] = path.split('/')
  return topLevelDirectory || null
}

function targetLayerFromTail(targetTail) {
  if (!targetTail) {
    return '(root)'
  }

  const parts = targetTail.split('/')
  const layerIndex = parts.findIndex((part) => SEMANTIC_LAYERS.has(part))
  if (layerIndex === -1) {
    return parts[0] || '(root)'
  }

  if (parts[layerIndex] === 'application' && parts[layerIndex + 1] === 'ports') {
    return 'application/ports'
  }

  return parts[layerIndex] ?? '(root)'
}

export function resolveModuleTarget(file, specifier) {
  const aliasMatch = /^#modules\/([^/]+)(?:\/(.*))?$/.exec(specifier)
  if (aliasMatch) {
    const targetModule = aliasMatch[1]
    const targetTail = aliasMatch[2] ?? ''

    return {
      resolution: 'alias',
      targetLayer: targetLayerFromTail(targetTail),
      targetModule,
      targetTail,
    }
  }

  if (!specifier.startsWith('.')) {
    return null
  }

  const absoluteTarget = resolve(dirname(resolve(file)), specifier)
  const relativeTarget = relative(MODULE_ROOT, absoluteTarget)

  if (
    relativeTarget === '' ||
    relativeTarget === '..' ||
    relativeTarget.startsWith(`..${sep}`) ||
    isAbsolute(relativeTarget)
  ) {
    return null
  }

  const [targetModule, ...tailParts] = relativeTarget.split(sep)
  if (!targetModule) {
    return null
  }

  const targetTail = tailParts.join('/')
  return {
    resolution: 'relative',
    targetLayer: targetLayerFromTail(targetTail),
    targetModule,
    targetTail,
  }
}

function literalModuleSpecifier(node) {
  return node && ts.isStringLiteralLike(node) ? node.text : null
}

function importReference(sourceFile, file, node, specifier, kind) {
  const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile))
  const target = resolveModuleTarget(file, specifier)

  return {
    file,
    kind,
    line: line + 1,
    resolution: target?.resolution ?? null,
    sourceModule: moduleNameFromPath(file),
    specifier,
    targetLayer: target?.targetLayer ?? null,
    targetModule: target?.targetModule ?? null,
    targetTail: target?.targetTail ?? null,
  }
}

export function scanFileImports(file) {
  const source = readFileSync(file, 'utf8')
  const sourceFile = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
    file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  )

  if (sourceFile.parseDiagnostics.length > 0) {
    const [diagnostic] = sourceFile.parseDiagnostics
    const position =
      diagnostic.start === undefined
        ? ''
        : `:${sourceFile.getLineAndCharacterOfPosition(diagnostic.start).line + 1}`
    const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')
    throw new Error(`Unable to parse ${file}${position}: ${message}`)
  }

  const references = []

  function visit(node) {
    if (ts.isImportDeclaration(node)) {
      const specifier = literalModuleSpecifier(node.moduleSpecifier)
      if (specifier) {
        references.push(importReference(sourceFile, file, node, specifier, 'import'))
      }
    } else if (ts.isExportDeclaration(node)) {
      const specifier = literalModuleSpecifier(node.moduleSpecifier)
      if (specifier) {
        references.push(importReference(sourceFile, file, node, specifier, 'export'))
      }
    } else if (
      ts.isImportEqualsDeclaration(node) &&
      ts.isExternalModuleReference(node.moduleReference)
    ) {
      const specifier = literalModuleSpecifier(node.moduleReference.expression)
      if (specifier) {
        references.push(importReference(sourceFile, file, node, specifier, 'import-equals'))
      }
    } else if (ts.isImportTypeNode(node)) {
      const specifier = literalModuleSpecifier(node.argument.literal)
      if (specifier) {
        references.push(importReference(sourceFile, file, node, specifier, 'import-type'))
      }
    } else if (ts.isCallExpression(node) && node.arguments.length === 1) {
      const specifier = literalModuleSpecifier(node.arguments[0])
      const isDynamicImport = node.expression.kind === ts.SyntaxKind.ImportKeyword
      const isRequireCall = ts.isIdentifier(node.expression) && node.expression.text === 'require'

      if (specifier && (isDynamicImport || isRequireCall)) {
        references.push(
          importReference(
            sourceFile,
            file,
            node,
            specifier,
            isDynamicImport ? 'dynamic-import' : 'require'
          )
        )
      }
    }

    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
  return references
}

export function scanTypeScriptImports(roots, { excludedSegments = [] } = {}) {
  const files = enumerateTypeScriptFiles(roots, { excludedSegments })
  return files.flatMap((file) => scanFileImports(file))
}

export function scanModuleImports(roots, { excludedSegments = [] } = {}) {
  return scanTypeScriptImports(roots, { excludedSegments }).filter(
    (reference) =>
      reference.targetModule !== null && reference.sourceModule !== reference.targetModule
  )
}

function parseCliArguments(argv) {
  const roots = []
  const excludedSegments = []
  let json = false

  for (const argument of argv) {
    if (argument === '--json') {
      json = true
    } else if (argument === '--exclude-tests') {
      excludedSegments.push('/tests/')
    } else if (argument.startsWith('--')) {
      throw new Error(`Unknown architecture scanner option: ${argument}`)
    } else {
      roots.push(argument)
    }
  }

  return {
    excludedSegments,
    json,
    roots: roots.length > 0 ? roots : DEFAULT_ROOTS,
  }
}

function runCli() {
  try {
    const { excludedSegments, json, roots } = parseCliArguments(process.argv.slice(2))
    const references = scanTypeScriptImports(roots, { excludedSegments })

    if (json) {
      process.stdout.write(`${JSON.stringify(references, null, 2)}\n`)
      return
    }

    for (const reference of references) {
      process.stdout.write(`${reference.file}:${reference.line}:${reference.specifier}\n`)
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`[architecture-import-scanner][ERROR] ${message}`)
    process.exitCode = 1
  }
}

const entrypoint = process.argv[1]
if (entrypoint && import.meta.url === pathToFileURL(resolve(entrypoint)).href) {
  runCli()
}
