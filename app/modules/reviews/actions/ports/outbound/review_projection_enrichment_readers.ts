import type {
  ReviewModeratorIdentity,
  ReviewSkillInfo,
} from '#modules/reviews/actions/ports/outbound/review_external_dependencies'
import type { ReviewTransaction } from '#modules/reviews/actions/ports/outbound/review_transaction'

export interface ReviewTaskAssignmentContextV1 {
  contractVersion: 1
  id: string
  taskId: string
  assigneeId: string
  assignmentStatus: 'active' | 'completed' | 'cancelled'
  estimatedHours: number | null
  actualHours: number | null
  completionNotes: string | null
  task: {
    id: string
    title: string
    description: string
    status: string
    priority: string
    difficulty: string | null
    dueDate: string | null
    projectId: string | null
    organizationId: string
  }
}

export abstract class ReviewAssignmentProjectionReader {
  abstract findReviewAssignmentContextsV1(
    assignmentIds: string[],
    trx?: ReviewTransaction
  ): Promise<ReviewTaskAssignmentContextV1[]>

  abstract listAssignmentIdsByProjectIdsIncludingDeletedTasks(
    projectIds: string[],
    trx?: ReviewTransaction
  ): Promise<string[]>
}

export abstract class ReviewModeratorIdentityProjectionReader {
  abstract findByIds(
    userIds: string[],
    trx?: ReviewTransaction
  ): Promise<ReviewModeratorIdentity[]>

  abstract findIdsByUsername(username: string): Promise<string[]>
}

export abstract class ReviewSkillIdentityReader {
  abstract findSkillsByIds(
    skillIds: string[],
    trx?: ReviewTransaction
  ): Promise<ReviewSkillInfo[]>
}
