import { createHash } from 'node:crypto'

import type { estypes } from '@elastic/elasticsearch'

import { FilterExecutionError } from '#modules/filtering/public_contracts/filter_diagnostics'
import type { QueryCriteriaRequest } from '#modules/filtering/public_contracts/filter_query'
import type { ElasticsearchSemanticBindings } from '#modules/search/infra/adapters/search-discovery/filtering/elasticsearch_filter_compiler'

export type FilterExpression = NonNullable<QueryCriteriaRequest['filter']>
export type SearchHitSort = string | number | boolean | null

export function capabilityError(): never {
  throw new FilterExecutionError('FILTER_EXECUTOR_CAPABILITY_MISMATCH')
}

export function criteriaError(): never {
  throw new FilterExecutionError('FILTER_CRITERIA_INVALID')
}

export function responseError(): never {
  throw new FilterExecutionError('FILTER_EXECUTOR_RESPONSE_INVALID')
}

export function unavailableError(): never {
  throw new FilterExecutionError('FILTER_EXECUTOR_UNAVAILABLE')
}

export function timeoutError(): never {
  throw new FilterExecutionError('FILTER_PROVIDER_TIMED_OUT')
}

export function throwIfAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted) throw new FilterExecutionError('FILTER_REQUEST_ABORTED')
}

export function isAbortError(error: unknown): boolean {
  return (
    error instanceof Error && (error.name === 'AbortError' || error.name === 'RequestAbortedError')
  )
}

export function isExpiredSearchContext(error: unknown): boolean {
  if (error === null || typeof error !== 'object') return false
  const serialized = JSON.stringify(error)
  return serialized.includes('search_context_missing_exception') || serialized.includes('404')
}

export function shouldUseFuzzyMatching(query: string): boolean {
  return Array.from(query.trim()).length >= 4
}

export function collectRequiredMappingPaths(bindings: ElasticsearchSemanticBindings): string[] {
  const paths = new Set<string>()
  for (const binding of Object.values(bindings)) {
    if (binding.type === 'relation') {
      for (const path of collectRequiredMappingPaths(binding.relationBindings ?? {})) {
        paths.add(path)
      }
    } else {
      paths.add(binding.path)
    }
    if (binding.presencePath !== undefined) paths.add(binding.presencePath)
    if (binding.cardinalityPath !== undefined) paths.add(binding.cardinalityPath)
    if (binding.ancestorPath !== undefined) paths.add(binding.ancestorPath)
  }
  return [...paths]
}

export function criteriaWithoutCursor(criteria: QueryCriteriaRequest): unknown {
  return {
    ...criteria,
    page: {
      size: criteria.page.size,
      ...(criteria.page.offset === undefined ? {} : { offset: criteria.page.offset }),
    },
  }
}

export function hashValue(value: unknown): string {
  return createHash('sha256').update(stableStringify(value), 'utf8').digest('base64url')
}

export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  return `{${Object.entries(value)
    .filter(([, child]) => child !== undefined)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, child]) => `${JSON.stringify(key)}:${stableStringify(child)}`)
    .join(',')}}`
}

export function normalizeSearchAfter(sort: readonly unknown[]): SearchHitSort[] {
  return sort.map((value) => {
    if (
      value === null ||
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      return value
    }
    return responseError()
  })
}

export function resolveTotal(
  total: number | estypes.SearchTotalHits | undefined,
  partial: boolean
): { value: number; relation: 'eq' | 'gte' | 'unknown' } {
  if (total === undefined) return responseError()
  const value = typeof total === 'number' ? total : total.value
  const relation = typeof total === 'number' ? 'eq' : total.relation === 'eq' ? 'eq' : 'gte'
  if (!Number.isSafeInteger(value) || value < 0) return responseError()
  return partial ? { value, relation: 'gte' } : { value, relation }
}

export function countConditions(expression: FilterExpression | undefined): number {
  if (expression === undefined) return 0
  if (expression.kind === 'condition') return 1
  return expression.children.reduce((total, child) => total + countConditions(child), 0)
}
