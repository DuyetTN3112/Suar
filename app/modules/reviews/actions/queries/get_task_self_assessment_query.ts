import ReviewSessionRepository from '#modules/reviews/infra/repositories/review_session_repository'
import TaskSelfAssessmentRepository from '#modules/reviews/infra/repositories/task_self_assessment_repository'
import type { TaskSelfAssessmentRecord } from '#modules/reviews/types/review_records'

/**
 * Query: get reviewee self-assessment by review session id.
 */
export default class GetTaskSelfAssessmentQuery {
  async execute(
    reviewSessionId: string
  ): Promise<TaskSelfAssessmentRecord | null> {
    const session = await ReviewSessionRepository.findById(reviewSessionId)
    if (!session) return null

    return TaskSelfAssessmentRepository.findByTaskAssignmentAndUser(
      session.task_assignment_id,
      session.reviewee_id
    )
  }
}
