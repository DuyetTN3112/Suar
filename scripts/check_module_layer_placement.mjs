#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs'

import { enumerateTypeScriptFiles, scanTypeScriptImports } from './architecture/import_scanner.mjs'

const MODULE_ROOT = 'app/modules'
const TOP_LEVEL_SERVICE_ROOT = 'app/services'
const COMPOSITION_ROOT = 'app/composition'
const COMMAND_ROOT = 'commands'
const EXCLUDED_SEGMENTS = ['/tests/']
const REVIEW_PATH = new URL('./module_layer_placement_reviews.json', import.meta.url)
const SHARED_ACTION_ROOT_FILES = new Set([
  'app/modules/tasks/actions/task_application_review_access.ts',
  'app/modules/tasks/actions/task_completion_package_access.ts',
  'app/modules/tasks/actions/task_permission_context.ts',
])

const SUPPORT_ROLES_BY_OWNER = new Map([
  ['actions', new Set(['application-helper'])],
  ['controllers', new Set(['transport-helper'])],
  ['infra', new Set(['infrastructure-helper'])],
  ['middleware', new Set(['transport-helper'])],
  ['validators', new Set(['transport-helper'])],
])
const DISALLOWED_TECHNOLOGY_PREFIXES = [
  '@adonisjs/',
  '@vinejs/',
  'node:',
  '#composition/',
  '#config/',
  '#database/',
  '#start/',
]
const CONTROLLER_TECHNOLOGY_PREFIXES = [
  '@adonisjs/lucid',
  '@adonisjs/redis',
  'node:',
  '#composition/',
  '#config/',
  '#database/',
  '#start/',
]
const ACTION_FORBIDDEN_TARGET_LAYERS = new Set([
  'bootstrap',
  'controllers',
  'infra',
  'listeners',
  'middleware',
])
const DOMAIN_FORBIDDEN_TARGET_LAYERS = new Set([
  'actions',
  'bootstrap',
  'controllers',
  'infra',
  'listeners',
  'middleware',
  'observability',
])
const PUBLIC_CONTRACT_FORBIDDEN_TARGET_LAYERS = new Set([
  'actions',
  'application',
  'bootstrap',
  'controllers',
  'domain',
  'infra',
  'listeners',
  'middleware',
  'observability',
  'services',
  'support',
])
const CONTROLLER_FORBIDDEN_TARGET_LAYERS = new Set(['bootstrap', 'infra'])
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
  'validators',
])

function fail(message) {
  console.error(`[module-layer-placement][ERROR] ${message}`)
  process.exit(1)
}

if (existsSync(TOP_LEVEL_SERVICE_ROOT)) {
  fail(
    `${TOP_LEVEL_SERVICE_ROOT} is a forbidden generic service root; classify each behavior under its owning module and precise architectural role`
  )
}

function loadReviews() {
  let reviews

  try {
    reviews = JSON.parse(readFileSync(REVIEW_PATH, 'utf8'))
  } catch (error) {
    fail(
      `Unable to read placement reviews at ${REVIEW_PATH.pathname}: ${
        error instanceof Error ? error.message : String(error)
      }`
    )
  }

  if (
    !Array.isArray(reviews) ||
    !reviews.every(
      (review) =>
        typeof review === 'object' &&
        review !== null &&
        typeof review.file === 'string' &&
        typeof review.role === 'string' &&
        typeof review.reason === 'string' &&
        review.reason.trim().length >= 12
    )
  ) {
    fail(
      'Placement reviews must be an array of { file, role, reason } entries with a meaningful reason'
    )
  }

  const byFile = new Map()
  for (const review of reviews) {
    if (byFile.has(review.file)) {
      fail(`Duplicate placement review for ${review.file}`)
    }
    byFile.set(review.file, review)
  }

  return byFile
}

function modulePathParts(file) {
  const match = /^app\/modules\/([^/]+)\/(.+)$/u.exec(file)
  if (!match) {
    return null
  }

  return {
    moduleName: match[1],
    tail: match[2],
    tailParts: match[2].split('/'),
  }
}

function sourceLayer(file) {
  return modulePathParts(file)?.tailParts.find((part) => SEMANTIC_LAYERS.has(part)) ?? null
}

function isTechnologyImport(specifier, prefixes) {
  return prefixes.some((prefix) => specifier === prefix || specifier.startsWith(prefix))
}

function importViolation(reference) {
  const layer = sourceLayer(reference.file)
  const pathParts = modulePathParts(reference.file)?.tailParts ?? []
  const isSupportFile = pathParts.includes('support')
  const isCommandOrQueryFile =
    pathParts.includes('actions') &&
    pathParts.some((part) => /^(?:commands?|query|queries)$/u.test(part))
  const isInboundPortFile =
    pathParts.includes('actions') && pathParts.includes('ports') && pathParts.includes('inbound')
  const targetsCommandOrQuery =
    reference.targetLayer === 'actions' &&
    /(?:^|\/)actions\/(?:command|commands|query|queries)(?:\/|$)/u.test(reference.targetTail ?? '')
  const targetsOutboundPort =
    reference.targetLayer === 'actions' &&
    /(?:^|\/)actions\/ports\/outbound(?:\/|$)/u.test(reference.targetTail ?? '')
  const targetsActionService =
    reference.targetLayer === 'actions' &&
    /(?:^|\/)actions\/services(?:\/|$)/u.test(reference.targetTail ?? '')

  if (
    isSupportFile &&
    (targetsOutboundPort ||
      targetsActionService ||
      reference.targetLayer === 'infra' ||
      isTechnologyImport(reference.specifier, DISALLOWED_TECHNOLOGY_PREFIXES))
  ) {
    return 'support contains I/O/runtime collaboration instead of a pure owner-layer helper'
  }

  if (layer === 'actions' && targetsCommandOrQuery && !isCommandOrQueryFile && !isInboundPortFile) {
    return 'action helper imports a command/query outside an owning use case; orchestration belongs to the command/query and construction belongs to composition'
  }

  if (targetsActionService && !isCommandOrQueryFile) {
    return 'application service is consumed outside a command/query instead of remaining a subordinate use-case collaborator'
  }

  if (layer === 'actions') {
    if (isTechnologyImport(reference.specifier, DISALLOWED_TECHNOLOGY_PREFIXES)) {
      return 'application code depends on a framework/runtime/composition technology'
    }
    if (ACTION_FORBIDDEN_TARGET_LAYERS.has(reference.targetLayer)) {
      return `application code imports the ${reference.targetLayer} implementation layer`
    }
  }

  if (layer === 'domain') {
    if (isTechnologyImport(reference.specifier, DISALLOWED_TECHNOLOGY_PREFIXES)) {
      return 'domain code depends on a framework/runtime/composition technology'
    }
    if (DOMAIN_FORBIDDEN_TARGET_LAYERS.has(reference.targetLayer)) {
      return `domain code imports the ${reference.targetLayer} layer`
    }
  }

  if (layer === 'public_contracts') {
    if (isTechnologyImport(reference.specifier, DISALLOWED_TECHNOLOGY_PREFIXES)) {
      return 'public contract exposes a framework/runtime/composition technology'
    }
    if (PUBLIC_CONTRACT_FORBIDDEN_TARGET_LAYERS.has(reference.targetLayer)) {
      return `public contract imports implementation layer ${reference.targetLayer}`
    }
  }

  if (layer === 'controllers') {
    if (targetsOutboundPort || targetsActionService) {
      return 'controller bypasses the inbound application boundary through a service/outbound port'
    }
    if (isTechnologyImport(reference.specifier, CONTROLLER_TECHNOLOGY_PREFIXES)) {
      return 'controller depends on persistence/runtime/composition instead of an inbound capability'
    }
    if (CONTROLLER_FORBIDDEN_TARGET_LAYERS.has(reference.targetLayer)) {
      return `controller imports the ${reference.targetLayer} implementation layer`
    }
  }

  return null
}

function placementExpectation(file) {
  const path = modulePathParts(file)
  if (!path) {
    return null
  }

  const { tailParts } = path
  const serviceIndex = tailParts.indexOf('services')
  const supportIndex = tailParts.indexOf('support')

  if (serviceIndex === -1 && supportIndex === -1) {
    return null
  }

  if (serviceIndex === 0 || supportIndex === 0) {
    return {
      allowedRoles: new Set(),
      reason: 'generic module-root services/support folders are forbidden',
    }
  }

  if (serviceIndex !== -1) {
    return {
      allowedRoles: new Set(),
      reason:
        'generic services folders are forbidden; use a precise action-root or command/query-internal collaborator, named domain policy, port, adapter, repository, worker, or composition owner',
    }
  }

  const owner =
    tailParts
      .slice(0, supportIndex)
      .reverse()
      .find((part) => SUPPORT_ROLES_BY_OWNER.has(part)) ?? tailParts[supportIndex - 1]
  return {
    allowedRoles: SUPPORT_ROLES_BY_OWNER.get(owner) ?? new Set(),
    reason: `support requires a reviewed helper role owned by ${owner ?? '(module root)'}`,
  }
}

function supportWorkflowViolation(file, source) {
  if (!file.split('/').includes('support')) {
    return null
  }

  const workflowPatterns = [
    {
      pattern: /\basync\b|\bPromise\s*</u,
      reason: 'support performs asynchronous work and must move to a named application/infra role',
    },
    {
      pattern: /\bnew\s+[A-Z][A-Za-z0-9]*(?:Command|Query)\s*\(/u,
      reason: 'support constructs a command/query and therefore orchestrates a use case',
    },
    {
      pattern: /\b(?:Command|Query)\s*\.\s*(?:execute|handle)\s*\(/u,
      reason: 'support invokes a command/query and therefore orchestrates a use case',
    },
    {
      pattern:
        /\b(?:db|trx|transaction)\s*\.\s*(?:from|table|insertQuery|modelQuery|rawQuery)\s*\(/u,
      reason: 'support directly orchestrates persistence',
    },
  ]

  return workflowPatterns.find(({ pattern }) => pattern.test(source))?.reason ?? null
}

function opaqueBoundaryRoleViolation(file, source) {
  const layer = sourceLayer(file)
  if (layer !== 'actions' && layer !== 'controllers') {
    return null
  }

  const pathParts = modulePathParts(file)?.tailParts ?? []
  if (pathParts.includes('facades')) {
    return `${layer}/facades is forbidden; expose a precise inbound contract or keep object-graph composition outside the module`
  }
  if (pathParts.includes('factories')) {
    return `${layer}/factories is forbidden; construct commands/queries in bootstrap or composition and place pure value construction in a mapper/builder`
  }

  const fileName = file.split('/').at(-1) ?? file
  if (/(?:_service|_support|public_api)\.ts$/u.test(fileName)) {
    return `${layer} uses an opaque service/support/public-api filename instead of a command, query, mapper, validator, port, or precise subordinate collaborator role`
  }

  return null
}

function actionRootPlacementViolation(file) {
  const pathParts = modulePathParts(file)?.tailParts ?? []
  const actionsIndex = pathParts.indexOf('actions')
  if (actionsIndex === -1 || pathParts.length !== actionsIndex + 2) {
    return null
  }

  const fileName = pathParts.at(-1) ?? file
  if (
    /^(?:base_command|base_query|interfaces|result|action_context|[a-z0-9_]+_action_context)\.ts$/u.test(
      fileName
    ) ||
    SHARED_ACTION_ROOT_FILES.has(file)
  ) {
    return null
  }

  return 'actions root is closed to new collaborators; place the behavior in a command/query family, domain policy, port, mapper, adapter, repository, worker, or amend the architecture contract explicitly'
}

function opaqueServiceSupportDeclarationViolation(file, source) {
  const fileName = file.split('/').at(-1) ?? file
  if (/(?:_service|_support)\.ts$/u.test(fileName)) {
    return 'production uses an opaque *_service/*_support filename instead of a precise architectural role'
  }

  const declaration =
    /^(?:export\s+)?(?:default\s+)?(?:abstract\s+)?(?:async\s+)?(?:class|interface|type|const|function)\s+([A-Za-z_$][A-Za-z0-9_$]*(?:Service|Support))\b/mu.exec(
      source
    )
  if (declaration && !declaration[1].endsWith('ServicePrincipal')) {
    return `production declares opaque symbol ${declaration[1]}; name the adapter, port, policy, resolver, store, executor, command, or query role`
  }

  return null
}

function hiddenUseCaseConstructionViolation(file, source) {
  const pathParts = modulePathParts(file)?.tailParts ?? []
  const isOwningUseCase = pathParts.some((part) => /^(?:commands?|query|queries)$/u.test(part))
  if (isOwningUseCase) {
    return null
  }

  if (/\bnew\s+[A-Z][A-Za-z0-9_]*(?:Command|Query)\s*\(/u.test(source)) {
    if (pathParts.includes('actions')) {
      return 'action helper/facade constructs a command/query outside an owning use case; move orchestration into the command/query or object construction into composition'
    }

    return `${sourceLayer(file) ?? 'module code'} constructs a command/query implementation; object-graph construction belongs to bootstrap or composition`
  }

  return null
}

function controllerWorkflowViolation(file, source) {
  if (!file.split('/').includes('controllers')) {
    return null
  }

  if (/\binject\s*\(\s*\)\s*\(\s*[A-Z][A-Za-z0-9_$]*\s*\)/u.test(source)) {
    return 'controller applies inject() manually after class compilation; use the @inject() decorator so constructor metadata is emitted'
  }

  if (/\bnew\s+[A-Z][A-Za-z0-9]*(?:Command|Query)\s*\(/u.test(source)) {
    return 'controller constructs a command/query instead of receiving an inbound factory'
  }

  return null
}

function isCompositionFactoryFile(file) {
  const fileName = file.split('/').at(-1) ?? file
  return file.includes('/factories/') || /(?:^|_)(?:factory|factories)\.ts$/u.test(fileName)
}

function compositionFactoryWorkflowViolation(file, source) {
  if (!isCompositionFactoryFile(file)) {
    return null
  }

  if (/\basync\b|\bawait\b|\bPromise\s*</u.test(source)) {
    return 'composition factory performs asynchronous work instead of synchronous object-graph construction'
  }

  if (/\.\s*(?:execute|handle)\s*\(/u.test(source)) {
    return 'composition factory executes a command/query instead of only constructing it'
  }

  return null
}

function aceCommandAutoloadViolation(file, source) {
  if (file.split('/').length !== 2) {
    return 'Ace recursively autoloads commands/**; nested helpers must move to their owning feature layer'
  }

  if (
    !/\bexport\s+default\s+class\s+[A-Za-z_$][A-Za-z0-9_$]*\s+extends\s+BaseCommand\b/u.test(source)
  ) {
    return 'Ace command modules must default-export a BaseCommand subclass'
  }

  return null
}

function formatViolations(violations, limit = 80) {
  const visible = violations.slice(0, limit)
  const lines = visible.map(
    ({ file, line, specifier, reason }) =>
      `${file}${line ? `:${line}` : ''}${specifier ? ` -> ${specifier}` : ''} (${reason})`
  )

  if (violations.length > visible.length) {
    lines.push(`... ${violations.length - visible.length} additional violations omitted`)
  }

  return lines.join('\n')
}

const files = enumerateTypeScriptFiles([MODULE_ROOT], {
  excludedSegments: EXCLUDED_SEGMENTS,
})
const compositionFactoryFiles = enumerateTypeScriptFiles([COMPOSITION_ROOT], {
  excludedSegments: EXCLUDED_SEGMENTS,
}).filter(isCompositionFactoryFile)
const commandFiles = enumerateTypeScriptFiles([COMMAND_ROOT], {
  excludedSegments: EXCLUDED_SEGMENTS,
})
const importReferences = scanTypeScriptImports([MODULE_ROOT], {
  excludedSegments: EXCLUDED_SEGMENTS,
})

const reviews = loadReviews()
const violations = []
const reviewedFiles = new Set()

for (const reference of importReferences) {
  const reason = importViolation(reference)
  if (reason) {
    violations.push({
      file: reference.file,
      line: reference.line,
      reason,
      specifier: reference.specifier,
    })
  }
}

for (const file of files) {
  const source = readFileSync(file, 'utf8')
  const controllerReason = controllerWorkflowViolation(file, source)
  if (controllerReason) {
    violations.push({
      file,
      reason: controllerReason,
    })
  }

  const opaqueBoundaryRoleReason = opaqueBoundaryRoleViolation(file, source)
  if (opaqueBoundaryRoleReason) {
    violations.push({
      file,
      reason: opaqueBoundaryRoleReason,
    })
  }

  const actionRootPlacementReason = actionRootPlacementViolation(file)
  if (actionRootPlacementReason) {
    violations.push({
      file,
      reason: actionRootPlacementReason,
    })
  }

  const opaqueServiceSupportDeclarationReason = opaqueServiceSupportDeclarationViolation(
    file,
    source
  )
  if (opaqueServiceSupportDeclarationReason) {
    violations.push({
      file,
      reason: opaqueServiceSupportDeclarationReason,
    })
  }

  const hiddenUseCaseConstructionReason = hiddenUseCaseConstructionViolation(file, source)
  if (hiddenUseCaseConstructionReason) {
    violations.push({
      file,
      reason: hiddenUseCaseConstructionReason,
    })
  }

  const expectation = placementExpectation(file)
  if (!expectation) {
    continue
  }

  const review = reviews.get(file)
  if (expectation.allowedRoles.size === 0) {
    violations.push({
      file,
      reason: expectation.reason,
    })
    continue
  }

  const workflowReason = supportWorkflowViolation(file, source)
  const hasIntrinsicPlacementViolation = Boolean(workflowReason)

  if (!review && !hasIntrinsicPlacementViolation) {
    violations.push({
      file,
      reason: `${expectation.reason}; no placement review is recorded`,
    })
  } else if (
    review &&
    !expectation.allowedRoles.has(review.role) &&
    !hasIntrinsicPlacementViolation
  ) {
    violations.push({
      file,
      reason: `${expectation.reason}; role "${review.role}" is invalid here`,
    })
  } else if (review && expectation.allowedRoles.has(review.role)) {
    reviewedFiles.add(file)
  }

  if (workflowReason) {
    violations.push({
      file,
      reason: workflowReason,
    })
  }

  if (file.split('/').includes('support') && source.split(/\r?\n/u).length > 151 && !review) {
    violations.push({
      file,
      reason: 'support file exceeds 150 lines without an explicit placement review',
    })
  }
}

for (const file of reviews.keys()) {
  if (!files.includes(file)) {
    violations.push({
      file,
      reason: 'placement review is stale because the production file does not exist',
    })
  } else if (!placementExpectation(file)) {
    violations.push({
      file,
      reason: 'placement review is stale because the file is no longer in services/support',
    })
  }
}

for (const file of compositionFactoryFiles) {
  const reason = compositionFactoryWorkflowViolation(file, readFileSync(file, 'utf8'))
  if (reason) {
    violations.push({
      file,
      reason,
    })
  }
}

for (const file of commandFiles) {
  const reason = aceCommandAutoloadViolation(file, readFileSync(file, 'utf8'))
  if (reason) {
    violations.push({
      file,
      reason,
    })
  }
}

if (violations.length > 0) {
  const diagnosticLimit = Number.parseInt(
    process.env['MODULE_LAYER_PLACEMENT_DIAGNOSTIC_LIMIT'] ?? '80',
    10
  )
  fail(
    `Detected ${violations.length} layer/placement violation(s):\n${formatViolations(
      violations.sort(
        (left, right) =>
          left.file.localeCompare(right.file) ||
          (left.line ?? 0) - (right.line ?? 0) ||
          left.reason.localeCompare(right.reason)
      ),
      Number.isSafeInteger(diagnosticLimit) && diagnosticLimit > 0 ? diagnosticLimit : 80
    )}`
  )
}

console.log(`[module-layer-placement][OK] Checked ${files.length} production TypeScript files`)
console.log(
  `[module-layer-placement][OK] Checked ${compositionFactoryFiles.length} composition factory files`
)
console.log(`[module-layer-placement][OK] Checked ${commandFiles.length} Ace command files`)
console.log(`[module-layer-placement][OK] Reviewed ${reviewedFiles.size} service/support files`)
console.log('[module-layer-placement] PASSED')
