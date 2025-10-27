import type {
  GlobalSearchEntityType,
  GlobalSearchSourceName,
  GlobalSearchSourceStatus,
} from './types.js'

export const MIN_SEARCH_QUERY_LENGTH = 2
export const MAX_SEARCH_QUERY_LENGTH = 160
export const SEARCH_SOURCE_RESULT_LIMIT = 12
export const MAX_SEARCH_CENTER_RESULTS = 24

const ALL_SEARCH_SOURCES: GlobalSearchSourceName[] = [
  'talents',
  'tasks',
  'projects',
  'skills',
  'organizations',
  'comments',
]

export function normalizeRawSearchQuery(rawQuery: string): string {
  const query = rawQuery.trim().replace(/\s+/g, ' ')
  if (query.length <= MAX_SEARCH_QUERY_LENGTH) {
    return query
  }

  const truncated = query.slice(0, MAX_SEARCH_QUERY_LENGTH).trimEnd()
  const lastSpace = truncated.lastIndexOf(' ')
  if (lastSpace >= MIN_SEARCH_QUERY_LENGTH) {
    return truncated.slice(0, lastSpace)
  }

  return truncated
}

export async function settleSearchSource<T>(
  source: GlobalSearchSourceName,
  run: () => Promise<T>,
  fallback: T,
  countResults: (value: T) => number,
  timeoutMs: number
): Promise<{ value: T; status: GlobalSearchSourceStatus }> {
  const startedAt = Date.now()
  try {
    const value = await withSourceTimeout(run(), timeoutMs)
    return {
      value,
      status: {
        source,
        status: 'ok',
        resultCount: countResults(value),
        errorMessage: null,
        durationMs: Date.now() - startedAt,
      },
    }
  } catch (error) {
    const timedOut = error instanceof SearchSourceTimeoutError
    return {
      value: fallback,
      status: {
        source,
        status: timedOut ? 'timed_out' : 'failed',
        resultCount: 0,
        errorMessage: error instanceof Error ? error.message : String(error),
        durationMs: Date.now() - startedAt,
      },
    }
  }
}

export function buildSkippedSourceStatuses(
  sources: GlobalSearchSourceName[]
): GlobalSearchSourceStatus[] {
  return sources.map((source) => ({
    source,
    status: 'skipped',
    resultCount: 0,
    errorMessage: 'Search query must be at least 2 characters',
    durationMs: 0,
  }))
}

export function resolveTargetSources(
  entityTypes: GlobalSearchEntityType[] | undefined
): GlobalSearchSourceName[] {
  if (!entityTypes || entityTypes.length === 0) {
    return ALL_SEARCH_SOURCES
  }

  const sources = new Set<GlobalSearchSourceName>()
  for (const entityType of entityTypes) {
    switch (entityType) {
      case 'talent':
        sources.add('talents')
        break
      case 'task':
        sources.add('tasks')
        break
      case 'project':
        sources.add('projects')
        break
      case 'skill':
        sources.add('skills')
        break
      case 'organization':
        sources.add('organizations')
        break
      case 'comment':
        sources.add('comments')
        break
    }
  }

  return ALL_SEARCH_SOURCES.filter((source) => sources.has(source))
}

export function readSourceValue<T>(
  sourceValues: Map<GlobalSearchSourceName, unknown>,
  source: GlobalSearchSourceName,
  fallback: T
): T {
  return (sourceValues.get(source) as T | undefined) ?? fallback
}

class SearchSourceTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`Search source timed out after ${timeoutMs}ms`)
    this.name = 'SearchSourceTimeoutError'
  }
}

async function withSourceTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeout: NodeJS.Timeout | undefined
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_resolve, reject) => {
        timeout = setTimeout(() => {
          reject(new SearchSourceTimeoutError(timeoutMs))
        }, timeoutMs)
      }),
    ])
  } finally {
    if (timeout) clearTimeout(timeout)
  }
}
