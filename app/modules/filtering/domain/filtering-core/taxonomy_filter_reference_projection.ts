export interface FilterTaxonomyReferenceProjection {
  readonly fieldKey: string
  readonly namespace: string
  readonly termId: string
}

const REFERENCE_PATTERN = /^([a-z0-9][a-z0-9._-]*):([^:\s]+)$/u

export function extractTaxonomyFilterReferences(
  semanticState: unknown
): readonly FilterTaxonomyReferenceProjection[] {
  const references = new Map<string, FilterTaxonomyReferenceProjection>()
  const state = asRecord(semanticState)
  walkExpression(state?.filter, references)
  return [...references.values()].sort((left, right) =>
    `${left.namespace}:${left.termId}:${left.fieldKey}`.localeCompare(
      `${right.namespace}:${right.termId}:${right.fieldKey}`
    )
  )
}

function walkExpression(value: unknown, references: Map<string, FilterTaxonomyReferenceProjection>): void {
  const expression = asRecord(value)
  if (!expression) return

  if (expression.kind === 'condition' && typeof expression.field === 'string') {
    collectValue(expression.value, expression.field, references)
    return
  }

  if (expression.kind === 'group' && Array.isArray(expression.children)) {
    for (const child of expression.children) walkExpression(child, references)
  }
}

function collectValue(
  value: unknown,
  fieldKey: string,
  references: Map<string, FilterTaxonomyReferenceProjection>
): void {
  const filterValue = asRecord(value)
  if (!filterValue || typeof filterValue.kind !== 'string') return

  if (filterValue.kind === 'scalar') {
    collectReference(filterValue.value, fieldKey, references)
    return
  }
  if (filterValue.kind === 'set' && Array.isArray(filterValue.values)) {
    for (const entry of filterValue.values) collectReference(entry, fieldKey, references)
    return
  }
  if (filterValue.kind === 'hierarchy' && Array.isArray(filterValue.termIds)) {
    for (const entry of filterValue.termIds) collectReference(entry, fieldKey, references)
    return
  }
  if (filterValue.kind === 'relation') walkExpression(filterValue.expression, references)
}

function collectReference(
  value: unknown,
  fieldKey: string,
  references: Map<string, FilterTaxonomyReferenceProjection>
): void {
  if (typeof value !== 'string') return
  const match = REFERENCE_PATTERN.exec(value)
  if (!match) return
  const namespace = match[1]
  const termId = match[2]
  if (!namespace || !termId) return
  const key = `${fieldKey}\u0000${namespace}\u0000${termId}`
  references.set(key, { fieldKey, namespace, termId })
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}
