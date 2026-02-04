import { auditPublicApi } from '#actions/audit/public_api'
import { enforcePolicy } from '#actions/authorization/public_api'
import { BaseCommand } from '#actions/reviews/base_command'
import ReviewSessionRepository from '#infra/reviews/repositories/review_session_repository'
import TaskSelfAssessmentRepository from '#infra/reviews/repositories/task_self_assessment_repository'
import { canAccessReviewSession, canUpsertTaskSelfAssessment } from '#modules/reviews/domain/review_policy'
import type { TaskSelfAssessmentRecord } from '#types/review_records'

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
  TaskSelfAssessmentRecord
> {
  async handle(dto: UpsertTaskSelfAssessmentInput): Promise<TaskSelfAssessmentRecord> {
    return await this.executeInTransaction(async (trx) => {
      const userId = this.getCurrentUserId()

      const session = await ReviewSessionRepository.findById(dto.review_session_id, trx)
      enforcePolicy(canAccessReviewSession({ sessionExists: !!session }))
      if (!session) {
        throw new Error('Review session must exist after policy enforcement')
      }
      enforcePolicy(
        canUpsertTaskSelfAssessment({
          actorId: userId,
          sessionRevieweeId: session.reviewee_id,
        })
      )

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

        if (this.execCtx.userId) {
          await auditPublicApi.write(this.execCtx, {
            user_id: this.execCtx.userId,
            action: 'update_task_self_assessment',
            entity_type: 'review_session',
            entity_id: session.id,
            old_values: null,
            new_values: {
              self_assessment_id: existing.id,
            },
          })
        }

        return existing
      }

      const created = await TaskSelfAssessmentRepository.create(
        {
          task_assignment_id: session.task_assignment_id,
          user_id: userId,
          ...payload,
        },
        trx
      )

      if (this.execCtx.userId) {
        await auditPublicApi.write(this.execCtx, {
          user_id: this.execCtx.userId,
          action: 'create_task_self_assessment',
          entity_type: 'review_session',
          entity_id: session.id,
          old_values: null,
          new_values: {
            self_assessment_id: created.id,
          },
        })
      }

      return created
    })
  }
}
