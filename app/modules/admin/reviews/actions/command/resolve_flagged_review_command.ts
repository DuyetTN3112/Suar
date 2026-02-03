import type { AdminActionContext } from '#modules/admin/reviews/actions/action_context'
import { BaseCommand } from '#modules/admin/reviews/actions/command/base_command'
import type { ReviewModerationGateway } from '#modules/admin/reviews/actions/ports/outbound/review_moderation_gateway'
import { decideFlaggedReviewResolution } from '#modules/admin/reviews/domain/review_moderation_policy'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import ValidationException from '#modules/errors/public_contracts/validation_exception'

export interface ResolveFlaggedReviewDTO {
  flaggedReviewId: string
  action: 'dismiss' | 'confirm'
  notes: string
}

export default class ResolveFlaggedReviewCommand extends BaseCommand<ResolveFlaggedReviewDTO> {
  constructor(
    execCtx: AdminActionContext,
    private readonly moderationGateway: ReviewModerationGateway
  ) {
    super(execCtx)
  }

  async handle(dto: ResolveFlaggedReviewDTO): Promise<void> {
    const notesDecision = decideFlaggedReviewResolution({
      notes: dto.notes,
      status: 'pending',
    })
    if (!notesDecision.allowed) {
      throw ValidationException.field('notes', 'Moderation note is required')
    }

    const flaggedReview = await this.moderationGateway.getDetail(dto.flaggedReviewId)
    if (!flaggedReview) {
      throw NotFoundException.resource('Flagged review', dto.flaggedReviewId)
    }

    const decision = decideFlaggedReviewResolution({
      notes: notesDecision.normalizedNotes,
      status: flaggedReview.review.status,
    })
    if (!decision.allowed) {
      throw ValidationException.field(
        decision.reason === 'moderation_note_required' ? 'notes' : 'status',
        decision.reason === 'moderation_note_required'
          ? 'Moderation note is required'
          : 'Flagged review already resolved'
      )
    }

    await this.moderationGateway.resolve(
      {
        flaggedReviewId: dto.flaggedReviewId,
        action: dto.action,
        notes: decision.normalizedNotes,
      },
      this.execCtx
    )
  }
}
