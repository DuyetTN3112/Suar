export interface NotificationFeedShadowComparison {
  recipientId: string
  canonicalIds: string[]
  searchIds: string[]
  matches: boolean
  classification: 'match' | 'expected_projection_lag' | 'unexplained_mismatch' | 'search_error'
  missingIds: string[]
  extraIds: string[]
  staleIds: string[]
  stateMismatchIds: string[]
  searchAheadIds: string[]
  hasNextPageMatches: boolean
  errorClass?: string
}
