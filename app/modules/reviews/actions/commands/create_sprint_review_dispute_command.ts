import { randomUUID } from 'node:crypto'

import db from '@adonisjs/lucid/services/db'

import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import ForbiddenException from '#modules/http/exceptions/forbidden_exception'
import NotFoundException from '#modules/http/exceptions/not_found_exception'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
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
  constructor(private readonly execCtx: ReviewActionContext) {}

  async execute(dto: CreateSprintReviewDisputeDTO): Promise<SprintReviewDisputeResult> {
    const actorId = this.requireUserId()
    const trx = await db.transaction()

    try {
      const reviewPackage = (await trx
        .from('sprint_review_packages')
        .where('id', dto.package_id)
        .forUpdate()
        .first()) as { id: string; reviewer_id: string; status: string } | undefined

      if (!reviewPackage) {
        throw new NotFoundException('Sprint review package not found')
      }
      if (reviewPackage.reviewer_id !== actorId) {
        throw new ForbiddenException('Only package reviewer can dispute sprint review package')
      }
      if (reviewPackage.status !== 'submitted') {
        throw new BusinessLogicException('Only submitted sprint review package can be disputed')
      }
      if (dto.dispute_reason.trim().length === 0) {
        throw new BusinessLogicException('Sprint review dispute reason is required')
      }
      const disputeReviewType = dto.dispute_review_type ?? 'manager_review'
      if (!SPRINT_DISPUTE_REVIEW_TYPES.has(disputeReviewType)) {
        throw new BusinessLogicException('Unsupported sprint review dispute type')
      }

      const existing = (await trx
        .from('sprint_review_disputes')
        .where('package_id', dto.package_id)
        .first()) as { id: string } | undefined
      if (existing) {
        throw new BusinessLogicException('Sprint review package already has an active dispute')
      }

      const [created] = (await trx
        .table('sprint_review_disputes')
        .insert({
          id: randomUUID(),
          package_id: dto.package_id,
          opened_by: actorId,
          status: 'pending',
          dispute_reason: dto.dispute_reason.trim(),
          dispute_review_type: disputeReviewType,
          requested_outcome: dto.requested_outcome,
          created_at: db.raw('NOW()'),
          updated_at: db.raw('NOW()'),
        })
        .returning('*')) as Record<string, unknown>[]
      if (!created) {
        throw new BusinessLogicException('Sprint review dispute was not created')
      }

      await trx.commit()

      await auditPublicApi.write(this.execCtx, {
        action: 'create_sprint_review_dispute',
        entity_type: 'sprint_review_dispute',
        entity_id: created['id'] as string,
        new_values: {
          package_id: dto.package_id,
          dispute_review_type: disputeReviewType,
          requested_outcome: dto.requested_outcome,
        },
      })

      return created as unknown as SprintReviewDisputeResult
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }

  private requireUserId(): string {
    if (!this.execCtx.userId) {
      throw new UnauthorizedException()
    }

    return this.execCtx.userId
  }
}
