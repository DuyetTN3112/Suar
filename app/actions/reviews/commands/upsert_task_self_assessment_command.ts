import { BaseCommand } from '#actions/shared/base_command'
import ReviewSessionRepository from '#infra/reviews/repositories/review_session_repository'
import TaskSelfAssessmentRepository from '#infra/reviews/repositories/task_self_assessment_repository'
import ForbiddenException from '#exceptions/forbidden_exception'

interface UpsertTaskSelfAssessmentInput {
  review_session_id: string
  overall_satisfaction: number | null
  difficulty_felt: string | null
  confidence_level: number | null
  what_went_well: string | null
  what_would_do_different: string | null
  blockers_encountered: string[]
  skills_felt_lacking: string[]
  skills_felt_strong: string[]
}

/**
 * UpsertTaskSelfAssessmentCommand
 *
 * Reviewee can create/update self-assessment tied to review session assignment.
 */
export default class UpsertTaskSelfAssessmentCommand extends BaseCommand<
  UpsertTaskSelfAssessmentInput,
  import('#models/task_self_assessment').default
> {
  async handle(
    dto: UpsertTaskSelfAssessmentInput
  ): Promise<import('#models/task_self_assessment').default> {
    return await this.executeInTransaction(async (trx) => {
      const userId = this.getCurrentUserId()

      const session = await ReviewSessionRepository.findById(dto.review_session_id, trx)
      if (!session) {
        throw new ForbiddenException('Review session không tồn tại')
      }

      if (session.reviewee_id !== userId) {
        throw new ForbiddenException('Chỉ reviewee mới được tự đánh giá')
      }

      const existing = await TaskSelfAssessmentRepository.findByTaskAssignmentAndUser(
        session.task_assignment_id,
        userId,
        trx
      )

      const payload = {
        overall_satisfaction: dto.overall_satisfaction,
        difficulty_felt: dto.difficulty_felt,
        confidence_level: dto.confidence_level,
        what_went_well: dto.what_went_well,
        what_would_do_different: dto.what_would_do_different,
        blockers_encountered: dto.blockers_encountered,
        skills_felt_lacking: dto.skills_felt_lacking,
        skills_felt_strong: dto.skills_felt_strong,
      }

      if (existing) {
        existing.merge(payload)
        await TaskSelfAssessmentRepository.save(existing, trx)

        await this.logAudit('update_task_self_assessment', 'review_session', session.id, null, {
          self_assessment_id: existing.id,
        })

        return existing
      }

      const created = await TaskSelfAssessmentRepository.create(
        {
          task_assignment_id: session.task_assignment_id,
          user_id: userId,
          ...payload,
        },
        { client: trx }
      )

      await this.logAudit('create_task_self_assessment', 'review_session', session.id, null, {
        self_assessment_id: created.id,
      })

      return created
    })
  }
}
