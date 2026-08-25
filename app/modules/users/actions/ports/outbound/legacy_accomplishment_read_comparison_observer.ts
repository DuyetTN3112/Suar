import type { UserWorkHistoryViewerScope } from '#modules/users/actions/ports/outbound/user_work_history_reader'

export interface LegacyAccomplishmentReadComparison {
  readonly userId: string
  readonly viewerScope: UserWorkHistoryViewerScope
  readonly legacyCandidateCount: number
  readonly verifiedCandidateCount: number
  readonly overlapCount: number
  readonly legacyOnlyCount: number
  readonly verifiedOnlyCount: number
  readonly mergedCount: number
}

export interface LegacyAccomplishmentReadComparisonObserver {
  observe(comparison: LegacyAccomplishmentReadComparison): void
}
