import {
  isAcyclicFilterExpression,
  isFilterFieldType,
  isOptionalBoundedString,
  isRecord,
} from './filter_runtime_guards.js'

import type {
  FilterPermissionConstraint,
  FilterPermissionFieldBinding,
} from '#modules/filtering/actions/ports/outbound/filter_permission_constraint_provider'
import type { FilterAuthorizationBinding } from '#modules/filtering/actions/ports/outbound/filter_query_executor'
import type { FilterContextDefinition } from '#modules/filtering/domain/filtering-core/filter_context_definition'
import type { FilterExpression } from '#modules/filtering/domain/filtering-core/filter_expression'
import {
  hashFilterExpression,
  type FilterHashGenerator,
} from '#modules/filtering/domain/filtering-core/filter_hash'
import { FILTER_OPERATORS_BY_FIELD_TYPE } from '#modules/filtering/domain/filtering-core/filter_operators'
import type { FilterPrincipal } from '#modules/filtering/public_contracts/filter_context_provider'
import { FilterExecutionError } from '#modules/filtering/public_contracts/filter_diagnostics'

export function isPermissionConstraint(
  value: unknown,
  definition: FilterContextDefinition
): value is FilterPermissionConstraint {
  if (
    !isRecord(value) ||
    !Array.isArray(value.fieldBindings) ||
    typeof value.authorizationVersion !== 'string' ||
    value.authorizationVersion.trim().length === 0 ||
    value.authorizationVersion.length > definition.limits.maxTextLength ||
    value.fieldBindings.length > definition.capabilities.maxConditions ||
    (value.expression !== undefined &&
      !isAcyclicFilterExpression(value.expression, definition.capabilities.maxDepth + 2))
  ) {
    return false
  }
  const fields = new Set<string>()
  for (const binding of value.fieldBindings) {
    if (!isPermissionFieldBinding(binding) || fields.has(binding.field)) return false
    fields.add(binding.field)
  }
  return true
}

export function isPermissionFieldBinding(value: unknown): value is FilterPermissionFieldBinding {
  if (
    !isRecord(value) ||
    typeof value.field !== 'string' ||
    value.field.trim().length === 0 ||
    value.field.length > 255 ||
    !isFilterFieldType(value.type)
  ) {
    return false
  }
  const fieldType = value.type
  if (
    !Array.isArray(value.operators) ||
    value.operators.length === 0 ||
    !value.operators.every(
      (operator): operator is string =>
        typeof operator === 'string' && FILTER_OPERATORS_BY_FIELD_TYPE[fieldType].includes(operator)
    ) ||
    !Array.isArray(value.effects) ||
    value.effects.length === 0 ||
    !value.effects.every((effect) => effect === 'require' || effect === 'exclude')
  ) {
    return false
  }
  return (
    new Set(value.operators).size === value.operators.length &&
    new Set(value.effects).size === value.effects.length
  )
}

export function validateMandatoryEffects(
  expression: FilterExpression,
  bindings: readonly FilterPermissionFieldBinding[]
): boolean {
  const byField = new Map(bindings.map((binding) => [binding.field, binding]))
  const visit = (node: FilterExpression): boolean => {
    if (node.kind === 'group') return node.children.every(visit)
    const binding = byField.get(node.field)
    return (
      binding?.effects.includes(node.effect) === true &&
      (node.value?.kind !== 'relation' || visit(node.value.expression))
    )
  }
  return visit(expression)
}

export function permissionFingerprint(
  expression: FilterExpression | undefined,
  hashGenerator: FilterHashGenerator
): string {
  return expression === undefined ? 'none' : hashFilterExpression(expression, hashGenerator)
}

export function createAuthorizationBinding(input: {
  definition: FilterContextDefinition
  authorizationVersion: string
  hashGenerator: FilterHashGenerator
  mandatoryFilter?: FilterExpression
  eligibilityFilter?: FilterExpression
  effectiveContextFingerprint: string
}): FilterAuthorizationBinding {
  return Object.freeze({
    context: input.definition.key,
    schemaVersion: input.definition.version,
    authorizationVersion: input.authorizationVersion,
    mandatoryFingerprint: permissionFingerprint(input.mandatoryFilter, input.hashGenerator),
    eligibilityFingerprint: permissionFingerprint(input.eligibilityFilter, input.hashGenerator),
    effectiveContextFingerprint: input.effectiveContextFingerprint,
  }) as FilterAuthorizationBinding
}

export function snapshotPrincipal(principal: FilterPrincipal): FilterPrincipal {
  const candidate: unknown = principal
  if (
    !isRecord(candidate) ||
    (candidate.kind !== 'anonymous' && candidate.kind !== 'user' && candidate.kind !== 'service') ||
    !isOptionalBoundedString(candidate.id, 255) ||
    !isOptionalBoundedString(candidate.organizationId, 255) ||
    !isOptionalBoundedString(candidate.organizationRole, 64) ||
    !isOptionalBoundedString(candidate.authorizationVersion, 255)
  ) {
    throw new FilterExecutionError('FILTER_CRITERIA_INVALID')
  }
  return Object.freeze({
    kind: candidate.kind,
    ...(candidate.id === undefined ? {} : { id: candidate.id }),
    ...(candidate.organizationId === undefined ? {} : { organizationId: candidate.organizationId }),
    ...(candidate.organizationRole === undefined
      ? {}
      : { organizationRole: candidate.organizationRole }),
    ...(candidate.authorizationVersion === undefined
      ? {}
      : { authorizationVersion: candidate.authorizationVersion }),
  })
}
