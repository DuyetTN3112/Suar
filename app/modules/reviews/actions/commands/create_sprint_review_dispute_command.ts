import ConflictException from '#modules/errors/public_contracts/conflict_exception'
import ForbiddenException from '#modules/errors/public_contracts/forbidden_exception'
import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import ValidationException from '#modules/errors/public_contracts/validation_exception'
import type { ReviewCryptography } from '#modules/reviews/actions/ports/outbound/review_cryptography'
import type { SprintReviewDisputeUnitOfWork } from '#modules/reviews/actions/ports/outbound/sprint_review_dispute_unit_of_work'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'

export interface CreateSprintReviewDisputeDTO {
  package_id: string
  dispute_reason: string
  dispute_review_type?: 'manager_review' | 'environment_review'
  requested_outcome: 'add_context' | 'remove_review' | 'request_admin_review' | 'other'
}

export interface SprintReviewDisputeResult {
  id: string
  package_id: string
  opened_by: string
  status: string
  dispute_reason: string
  dispute_review_type: string
  requested_outcome: string
}

const SPRINT_DISPUTE_REVIEW_TYPES = new Set(['manager_review', 'environment_review'])

export default class CreateSprintReviewDisputeCommand {
  constructor(
    private readonly execCtx: ReviewActionContext,
    private readonly cryptography: ReviewCryptography,
    private readonly disputes: SprintReviewDisputeUnitOfWork
  ) {}

  async execute(dto: CreateSprintReviewDisputeDTO): Promise<SprintReviewDisputeResult> {
    const actorId = this.requireUserId()
    return this.disputes.run(async (persistence) => {
      const reviewPackage = await persistence.loadPackageForUpdate(dto.package_id)

      if (!reviewPackage) {
        throw new NotFoundException('Sprint review package not found')
      }
      if (reviewPackage.reviewer_id !== actorId) {
        throw new ForbiddenException('Only package reviewer can dispute sprint review package')
      }
      if (reviewPackage.status !== 'submitted') {
        throw new ConflictException('Only submitted sprint review package can be disputed')
      }
      if (dto.dispute_reason.trim().length === 0) {
        throw ValidationException.field(
          'dispute_reason',
          'Sprint review dispute reason is required'
        )
      }
      const disputeReviewType = dto.dispute_review_type ?? 'manager_review'
      if (!SPRINT_DISPUTE_REVIEW_TYPES.has(disputeReviewType)) {
        throw ValidationException.field(
          'dispute_review_type',
          'Unsupported sprint review dispute type'
        )
      }

      const existing = await persistence.findByPackageId(dto.package_id)
      if (existing) {
        throw new ConflictException('Sprint review package already has an active dispute')
      }

      const created = await persistence.createDispute({
        id: this.cryptography.nextId(),
        packageId: dto.package_id,
        openedBy: actorId,
        disputeReason: dto.dispute_reason.trim(),
        disputeReviewType,
        requestedOutcome: dto.requested_outcome,
      })
      if (typeof created['id'] !== 'string') {
        throw new InvariantViolationException(
          'Sprint review dispute insert returned no persisted row',
          {
            details: {
              packageId: dto.package_id,
            },
          }
        )
      }

      await persistence.writeAudit(
        this.execCtx,
        {
          action: 'create_sprint_review_dispute',
          entityId: created['id'],
          newValues: {
            package_id: dto.package_id,
            dispute_review_type: disputeReviewType,
            requested_outcome: dto.requested_outcome,
          },
        }
      )

      return created as unknown as SprintReviewDisputeResult
    })
  }

  private requireUserId(): string {
    if (!this.execCtx.userId) {
      throw new UnauthorizedException()
    }

    return this.execCtx.userId
  }
}
