import ReviewSessionRepository from '#infra/reviews/repositories/review_session_repository'
import TaskSelfAssessmentRepository from '#infra/reviews/repositories/task_self_assessment_repository'
import type { DatabaseId } from '#types/database'

/**
 * Query: get reviewee self-assessment by review session id.
 */
export default class GetTaskSelfAssessmentQuery {
  async execute(
    reviewSessionId: DatabaseId
  ): Promise<import('#models/task_self_assessment').default | null> {
    const session = await ReviewSessionRepository.findById(reviewSessionId)
    if (!session) return null

    return TaskSelfAssessmentRepository.findByTaskAssignmentAndUser(
      session.task_assignment_id,
      session.reviewee_id
    )
  }
}
