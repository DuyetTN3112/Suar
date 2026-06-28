import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import ConflictException from '#modules/errors/public_contracts/conflict_exception'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { BaseCommand } from '#modules/reviews/actions/base_command'
import RecalculateRevieweeSkillScoresCommand from '#modules/reviews/actions/commands/review-submission/recalculate_reviewee_skill_scores_command'
import type { ReviewUserSkillWriter } from '#modules/reviews/actions/ports/outbound/review_external_dependencies'
import type { ReviewExternalEffectPublisher } from '#modules/reviews/actions/ports/outbound/review_external_effects'
import type { ReviewFlaggedModerationUnitOfWork } from '#modules/reviews/actions/ports/outbound/review_flagged_moderation_unit_of_work'
import type { ReviewMetricsReader } from '#modules/reviews/actions/ports/outbound/review_metrics_reader'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'
import type { FlaggedReviewRecord } from '#modules/reviews/types/review_records'

/**
 * ResolveFlaggedReviewDTO
 */
export interface ResolveFlaggedReviewDTO {
  flagged_review_id: string
  action: 'dismissed' | 'confirmed'
  notes: string | null
}

/**
 * ResolveFlaggedReviewCommand
 *
 * Admin resolves a flagged review (dismiss or confirm the anomaly).
 * Khi confirm fraud:
 *   - Đánh dấu skill_review là fraud
 *   - Recalculate reviewee skill scores (loại bỏ review fraud)
 *   - Recalculate reviewer credibility
 *   - Audit log đầy đủ
 */
export default class ResolveFlaggedReviewCommand extends BaseCommand<
  ResolveFlaggedReviewDTO,
  FlaggedReviewRecord
> {
  constructor(
    execCtx: ReviewActionContext,
    private readonly userSkillWriter: ReviewUserSkillWriter,
    private readonly metricsReader: ReviewMetricsReader,
    private readonly externalEffects: Pick<ReviewExternalEffectPublisher, 'emitSkillScoreUpdated'>,
    private readonly moderation: ReviewFlaggedModerationUnitOfWork
  ) {
    super(execCtx)
  }

  async handle(dto: ResolveFlaggedReviewDTO): Promise<FlaggedReviewRecord> {
    const result = await this.moderation.run(async (persistence) => {
      const userId = this.getCurrentUserId()

      const flaggedReview = await persistence.findFlaggedReviewForUpdate(dto.flagged_review_id)

      if (!flaggedReview) {
        throw new NotFoundException('Flagged review không tồn tại')
      }

      if (flaggedReview.status !== 'pending') {
        throw new ConflictException('This flagged review has already been resolved')
      }

      const validActions: ResolveFlaggedReviewDTO['action'][] = ['dismissed', 'confirmed']
      if (!validActions.includes(dto.action)) {
        throw ValidationException.field('action', 'Action must be "dismissed" or "confirmed"')
      }

      const occurredAt = new Date()
      const resolvedFlaggedReview = await persistence.saveResolution({
        flaggedReview,
        status: dto.action,
        reviewedBy: userId,
        reviewedAt: occurredAt,
        notes: dto.notes,
      })

      // ── Fraud confirmed: rollback skill scores ────────────────────────
      const revieweeUserId =
        dto.action === 'confirmed'
          ? await persistence.markSkillReviewAsFraudAndFindReviewee(
              resolvedFlaggedReview.skill_review_id
            )
          : null
      let deferredSkillScoreUpdatedEvents: Awaited<
        ReturnType<RecalculateRevieweeSkillScoresCommand['handleInTransaction']>
      >['deferredSkillScoreUpdatedEvents'] = []
      if (revieweeUserId) {
        const recalculate = new RecalculateRevieweeSkillScoresCommand(
          this.execCtx,
          this.userSkillWriter,
          this.metricsReader,
          this.externalEffects
        )
        const recalculation = await recalculate.handleInTransaction(
          { userId: revieweeUserId },
          persistence.transaction
        )
        deferredSkillScoreUpdatedEvents = recalculation.deferredSkillScoreUpdatedEvents

        await persistence.stageTalentExplainabilityProjection({
          revieweeUserId,
          sourceEventId: resolvedFlaggedReview.id,
          occurredAt: occurredAt.toISOString(),
        })
      }

      if (this.execCtx.userId) {
        await auditPublicApi.write(
          this.execCtx,
          {
            user_id: this.execCtx.userId,
            action: 'resolve_flagged_review',
            critical: true,
            entity_type: 'flagged_review',
            entity_id: resolvedFlaggedReview.id,
            old_values: null,
            new_values: {
              action: dto.action,
              notes: dto.notes,
            },
          },
          persistence.transaction
        )
      }

      return { flaggedReview: resolvedFlaggedReview, deferredSkillScoreUpdatedEvents }
    })

    for (const eventPayload of result.deferredSkillScoreUpdatedEvents) {
      await this.settlePostCommitEffect(
        'review.skill_score.updated',
        () => this.externalEffects.emitSkillScoreUpdated(eventPayload),
        {
          entityId: result.flaggedReview.id,
          actorId: this.execCtx.userId ?? eventPayload.userId,
        }
      )
    }

    return result.flaggedReview
  }
}
