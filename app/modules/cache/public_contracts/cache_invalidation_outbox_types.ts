export interface CacheInvalidationOutboxBacklog {
  configured: boolean
  pending: number
  leased: number
  deadLetter: number
  oldestOutstandingAt: Date | null
}

export interface CacheInvalidationOutboxReplaySelector {
  ids?: string[]
  fromSequence?: number
  toSequence?: number
  errorClass?: string
}

export interface CacheInvalidationOutboxOperationalStatus {
  configured: boolean
  pending: number
  leased: number
  retryPending: number
  deadLetter: number
  processed: number
  oldestPendingAgeMs: number | null
}
