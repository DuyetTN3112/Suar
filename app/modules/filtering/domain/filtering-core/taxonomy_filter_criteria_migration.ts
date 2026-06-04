import type { FilterExpression, FilterValue } from '#modules/filtering/domain/filtering-core/filter_expression'
import type { SavedFilterSemanticState } from '#modules/filtering/domain/saved-filter-views/saved_filter_view'
import type { TaxonomyCriteriaMapping } from '#modules/taxonomy/public_contracts/taxonomy-governance/taxonomy_change_criteria_mapping'

export interface TaxonomyFilterCriteriaMigrationResult {
  readonly semanticState: SavedFilterSemanticState
  readonly changed: boolean
  readonly outcome: 'compatible' | 'migrated' | 'requires_repair' | 'blocked'
}

export function migrateTaxonomyFilterSemanticState(
  semanticState: SavedFilterSemanticState,
  mappings: readonly TaxonomyCriteriaMapping[]
) {

  const outcome = mappings.some(({ disposition }) => disposition === 'blocked')
    ? 'blocked'
    : mappings.some(({ disposition }) => disposition === 'requires_repair')
      ? 'requires_repair'
      : mappings.some(({ disposition }) => disposition === 'migrated' || disposition === 'deterministic')
        ? 'migrated'
        : 'compatible'
  if (outcome === 'blocked' || outcome === 'requires_repair') return { semanticState, changed: false, outcome }
  const bySource = new Map(mappings.filter((mapping): mapping is TaxonomyCriteriaMapping & { readonly to: { namespace: string; termId: string } } => mapping.to !== undefined).map((mapping) => [refKey(mapping.from), refKey(mapping.to)]))
  if (bySource.size === 0) return { semanticState, changed: false, outcome }
  const rewritten = semanticState.filter === null ? null : rewriteExpression(semanticState.filter, bySource)
  return { semanticState: rewritten === semanticState.filter ? semanticState : { ...semanticState, filter: rewritten }, changed: rewritten !== semanticState.filter, outcome }
}

function rewriteExpression(expression: FilterExpression, replacements: ReadonlyMap<string, string>): FilterExpression {
  if (expression.kind === 'group') {
    const children = expression.children.map((child) => rewriteExpression(child, replacements))
    return children.every((child, index) => child === expression.children[index]) ? expression : { ...expression, children }
  }
  if (expression.value === undefined) return expression
  const value = rewriteValue(expression.value, replacements)
  return value === expression.value ? expression : { ...expression, value }
}

function rewriteValue(value: FilterValue, replacements: ReadonlyMap<string, string>): FilterValue {
  switch (value.kind) {
    case 'scalar':
      if (typeof value.value !== 'string') return value
      const scalarReplacement = replacements.get(value.value)
      return scalarReplacement === undefined ? value : { ...value, value: scalarReplacement }
    case 'set': {
      const values = value.values.map((entry) => {
        if (typeof entry !== 'string') return entry
        return replacements.get(entry) ?? entry
      })
      return values.every((entry, index) => entry === value.values[index]) ? value : { ...value, values }
    }
    case 'hierarchy': {
      const termIds = value.termIds.map((termId) => replacements.get(termId) ?? termId)
      return termIds.every((termId, index) => termId === value.termIds[index]) ? value : { ...value, termIds }
    }
    case 'relation': {
      const expression = rewriteExpression(value.expression, replacements)
      return expression === value.expression ? value : { ...value, expression }
    }
    case 'range':
    case 'relative_time':
      return value
  }
}

function refKey(ref: { namespace: string; termId: string }): string { return `${ref.namespace}:${ref.termId}` }
