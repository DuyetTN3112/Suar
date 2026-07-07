import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import { BaseCommand } from '#modules/reviews/actions/base_command'
import type { ReviewSessionArtifactUnitOfWork } from '#modules/reviews/actions/ports/outbound/review_session_artifact_unit_of_work'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'
import {
  canAccessReviewSession,
  canUpsertTaskSelfAssessment,
} from '#modules/reviews/domain/review-core/review_policy'
import type { TaskSelfAssessmentRecord } from '#modules/reviews/types/review_records'

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

function requireUserId(ctx: ReviewActionContext): string {
  if (!ctx.userId) {
    throw new UnauthorizedException()
  }
  return ctx.userId
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
  constructor(
    execCtx: ReviewActionContext,
    private readonly unitOfWork: ReviewSessionArtifactUnitOfWork
  ) {
    super(execCtx)
  }

  async handle(dto: UpsertTaskSelfAssessmentInput): Promise<TaskSelfAssessmentRecord> {
    const userId = requireUserId(this.execCtx)

    return this.unitOfWork.run(async (persistence) => {
      const session = await persistence.loadSession(dto.review_session_id)
      enforcePolicy(canAccessReviewSession({ sessionExists: !!session }))
      if (!session) {
        throw new InvariantViolationException('Review session must exist after policy enforcement')
      }
      enforcePolicy(
        canUpsertTaskSelfAssessment({
          actorId: userId,
          sessionRevieweeId: session.revieweeId,
          hasRevieweeOutcome: session.confirmationUserIds.includes(userId),
        })
      )

      const existing = await persistence.findSelfAssessment(session.taskAssignmentId, userId)

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
        const updated = await persistence.updateSelfAssessment(
          session.taskAssignmentId,
          userId,
          payload
        )
        await persistence.writeAudit(this.execCtx, {
          userId,
          action: 'update_task_self_assessment',
          entityId: session.id,
          newValues: {
            self_assessment_id: updated.id,
          },
        })

        return updated
      }

      const created = await persistence.createSelfAssessment(
        session.taskAssignmentId,
        userId,
        payload
      )
      await persistence.writeAudit(this.execCtx, {
        userId,
        action: 'create_task_self_assessment',
        entityId: session.id,
        newValues: {
          self_assessment_id: created.id,
        },
      })

      return created
    })
  }
}
