import type {
  FilterCondition,
  FilterExpression,
  FilterValue,
} from '#modules/filtering/domain/filtering-core/filter_expression'
import type { FilterMigrationDiagnostic } from '#modules/filtering/domain/filtering-core/filter_migration_result'
import { canonicalizeFilterScalarSet } from '#modules/filtering/domain/filtering-core/filter_operators'

export type FilterSchemaMigrationOperation =
  | {
      readonly kind: 'rename_field'
      readonly fromField: string
      readonly toField: string
    }
  | {
      readonly kind: 'change_operator'
      readonly field: string
      readonly fromOperator: string
      readonly toOperator: string
      readonly valueTransform?: 'preserve' | 'scalar_to_set'
    }
  | {
      readonly kind: 'taxonomy_merge'
      readonly field: string
      readonly sourceTermIds: readonly string[]
      readonly replacementTermId: string
    }
  | {
      readonly kind: 'taxonomy_retire'
      readonly field: string
      readonly termId: string
      readonly replacementTermId: string | null
    }
  | {
      readonly kind: 'taxonomy_split'
      readonly field: string
      readonly termId: string
      readonly replacementTermIds: readonly string[]
    }

export function withConditionValue(
  condition: FilterCondition,
  value: FilterValue | undefined
): FilterCondition {
  const { value: _currentValue, ...withoutValue } = condition
  return value === undefined ? withoutValue : { ...withoutValue, value }
}

export function diagnostic(
  code: string,
  message: string,
  path: string | null = null
): FilterMigrationDiagnostic {
  return { code, path, message } satisfies FilterMigrationDiagnostic
}

export function mapFilterValueTerms(
  value: FilterValue | undefined,
  replacements: ReadonlyMap<string, string>
): { value: FilterValue | undefined; changed: boolean } {
  if (!value) return { value, changed: false }
  if (value.kind === 'scalar') {
    if (typeof value.value !== 'string') return { value, changed: false }
    const replacement = replacements.get(value.value)
    return replacement
      ? { value: { kind: 'scalar', value: replacement }, changed: replacement !== value.value }
      : { value, changed: false }
  }
  if (value.kind === 'set') {
    let changed = false
    const values = value.values.map((entry) => {
      if (typeof entry !== 'string') return entry
      const replacement = replacements.get(entry)
      if (replacement && replacement !== entry) changed = true
      return replacement ?? entry
    })
    return {
      value: value.minimumMatch === undefined ? { kind: 'set', values } : { ...value, values },
      changed,
    }
  }
  if (value.kind === 'hierarchy') {
    let changed = false
    const termIds = value.termIds.map((termId) => {
      const replacement = replacements.get(termId)
      if (replacement && replacement !== termId) changed = true
      return replacement ?? termId
    })
    return { value: { ...value, termIds }, changed }
  }
  return { value, changed: false }
}

export function filterValueContainsTerm(value: FilterValue | undefined, termId: string): boolean {
  if (!value) return false
  if (value.kind === 'scalar') return value.value === termId
  if (value.kind === 'set') return value.values.includes(termId)
  if (value.kind === 'hierarchy') return value.termIds.includes(termId)
  return false
}

export function taxonomyMinimumMatchDiagnostic(
  value: FilterValue | undefined,
  field: string
): FilterMigrationDiagnostic | null {
  if (value?.kind !== 'set' || value.minimumMatch === undefined) return null
  if (value.minimumMatch <= canonicalizeFilterScalarSet(value.values).length) return null
  return diagnostic(
    'taxonomy_minimum_match_requires_repair',
    'Taxonomy replacement collapsed selected terms below the required minimum match',
    `filter.${field}`
  )
}

export function transformExpression(
  expression: FilterExpression,
  operation: FilterSchemaMigrationOperation
): {
  expression: FilterExpression
  changed: boolean
  diagnostic: FilterMigrationDiagnostic | null
} {
  if (expression.kind === 'group') {
    let changed = false
    const children: FilterExpression[] = []
    for (const child of expression.children) {
      const transformed = transformExpression(child, operation)
      if (transformed.diagnostic) return transformed
      changed ||= transformed.changed
      children.push(transformed.expression)
    }
    return {
      expression: changed ? { ...expression, children } : expression,
      changed,
      diagnostic: null,
    }
  }

  let condition: FilterCondition = expression
  let changed = false
  if (condition.value?.kind === 'relation') {
    const nested = transformExpression(condition.value.expression, operation)
    if (nested.diagnostic) return nested
    if (nested.changed) {
      condition = { ...condition, value: { ...condition.value, expression: nested.expression } }
      changed = true
    }
  }

  switch (operation.kind) {
    case 'rename_field':
      if (condition.field === operation.fromField) {
        condition = { ...condition, field: operation.toField }
        changed = true
      }
      break
    case 'change_operator':
      if (condition.field === operation.field && condition.operator === operation.fromOperator) {
        let value = condition.value
        if (operation.valueTransform === 'scalar_to_set' && value?.kind === 'scalar') {
          value = { kind: 'set', values: [value.value] }
        }
        condition = {
          ...withConditionValue(condition, value),
          operator: operation.toOperator,
        }
        changed = true
      }
      break
    case 'taxonomy_merge':
      if (condition.field === operation.field) {
        const replacements = new Map(
          operation.sourceTermIds.map((termId) => [termId, operation.replacementTermId])
        )
        const transformed = mapFilterValueTerms(condition.value, replacements)
        if (transformed.changed) {
          const minimumMatchDiagnostic = taxonomyMinimumMatchDiagnostic(
            transformed.value,
            condition.field
          )
          if (minimumMatchDiagnostic) {
            return {
              expression,
              changed: false,
              diagnostic: minimumMatchDiagnostic,
            }
          }
          condition = withConditionValue(condition, transformed.value)
          changed = true
        }
      }
      break
    case 'taxonomy_retire':
      if (
        condition.field === operation.field &&
        filterValueContainsTerm(condition.value, operation.termId)
      ) {
        if (!operation.replacementTermId) {
          return {
            expression,
            changed: false,
            diagnostic: diagnostic(
              'retired_taxonomy_term_requires_repair',
              `Retired taxonomy term ${operation.termId} has no deterministic replacement`,
              `filter.${condition.field}`
            ),
          }
        }
        if (
          operation.replacementTermId.trim().length === 0 ||
          operation.replacementTermId === operation.termId
        ) {
          return {
            expression,
            changed: false,
            diagnostic: diagnostic(
              'invalid_taxonomy_replacement',
              'A retired taxonomy term must use a distinct non-empty replacement',
              `filter.${condition.field}`
            ),
          }
        }
        const transformed = mapFilterValueTerms(
          condition.value,
          new Map([[operation.termId, operation.replacementTermId]])
        )
        const minimumMatchDiagnostic = taxonomyMinimumMatchDiagnostic(
          transformed.value,
          condition.field
        )
        if (minimumMatchDiagnostic) {
          return {
            expression,
            changed: false,
            diagnostic: minimumMatchDiagnostic,
          }
        }
        condition = withConditionValue(condition, transformed.value)
        changed ||= transformed.changed
      }
      break
    case 'taxonomy_split':
      if (
        condition.field === operation.field &&
        filterValueContainsTerm(condition.value, operation.termId)
      ) {
        return {
          expression,
          changed: false,
          diagnostic: diagnostic(
            'ambiguous_taxonomy_split',
            `Taxonomy term ${operation.termId} splits into ${operation.replacementTermIds.join(', ')}`,
            `filter.${condition.field}`
          ),
        }
      }
      break
  }

  return { expression: condition, changed, diagnostic: null }
}
