import { createHash } from 'node:crypto'

export interface SearchQueryPrivacyFields {
  readonly normalizedQuery: string
  readonly queryTextLength: number
  readonly queryHash: string
}

export function buildSearchQueryPrivacyFields(query: string): SearchQueryPrivacyFields {
  const normalizedQuery = query.trim().replace(/\s+/g, ' ').toLowerCase()

  return {
    normalizedQuery,
    queryTextLength: normalizedQuery.length,
    queryHash: createHash('sha256').update(normalizedQuery).digest('hex'),
  }
}
