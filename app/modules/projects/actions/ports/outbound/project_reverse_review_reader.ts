import type { ReverseReviewTargetStatsRecord } from '#modules/reviews/public_contracts/reverse_review_stats'

export abstract class ProjectReverseReviewReader {
  abstract loadProjectStats(projectId: string): Promise<ReverseReviewTargetStatsRecord | null>
}
