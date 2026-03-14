import { randomUUID } from 'node:crypto'

import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { DateTime } from 'luxon'

import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import ForbiddenException from '#modules/http/exceptions/forbidden_exception'
import NotFoundException from '#modules/http/exceptions/not_found_exception'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'

export interface SubmitSprintReverseReviewWorkflowDTO {
  workflow_id: string
  rating: number
  comment: string
}

interface WorkflowRecord {
  id: string
  sprint_id: string
  organization_id: string
  reviewer_id: string
  target_type: 'assigner' | 'environment'
  target_user_id: string | null
  responder_id: string | null
  status: string
  package_id: string | null
}

export default class SubmitSprintReverseReviewWorkflowCommand {
  constructor(private readonly execCtx: ReviewActionContext) {}

  async execute(
    dto: SubmitSprintReverseReviewWorkflowDTO
  ): Promise<{ id: string; status: string }> {
    const actorId = this.requireUserId()
    this.assertValidInput(dto)
    const trx = await db.transaction()

    try {
      const workflow = (await trx
        .from('sprint_reverse_review_workflows')
        .where('id', dto.workflow_id)
        .forUpdate()
        .first()) as WorkflowRecord | undefined
      if (!workflow) {
        throw new NotFoundException('Review sau sprint workflow not found')
      }
      if (workflow.reviewer_id !== actorId) {
        throw new ForbiddenException('Only workflow reviewer can submit review sau sprint')
      }
      if (workflow.status !== 'awaiting_review') {
        throw new BusinessLogicException('Review sau sprint workflow is not awaiting review')
      }
      if (!workflow.package_id) {
        throw new BusinessLogicException('Review sau sprint workflow has no review package')
      }

      const now = DateTime.utc()
      await this.persistSubmittedReview(workflow, dto, trx, now)
      await trx.from('sprint_reverse_review_workflows').where('id', workflow.id).update({
        status: 'awaiting_response',
        rating: dto.rating,
        comment: dto.comment.trim(),
        submitted_at: now.toSQL(),
        updated_at: now.toSQL(),
      })
      await trx.table('sprint_reverse_review_messages').insert({
        id: randomUUID(),
        workflow_id: workflow.id,
        author_id: actorId,
        message_type: 'review',
        body: dto.comment.trim(),
        metadata: JSON.stringify({ rating: dto.rating }),
        created_at: now.toSQL(),
      })

      await trx.commit()
      return { id: workflow.id, status: 'awaiting_response' }
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

  private assertValidInput(dto: SubmitSprintReverseReviewWorkflowDTO): void {
    if (!Number.isInteger(dto.rating) || dto.rating < 1 || dto.rating > 5) {
      throw new BusinessLogicException('Review sau sprint rating must be an integer from 1 to 5')
    }
    if (!dto.comment.trim()) {
      throw new BusinessLogicException('Review sau sprint comment is required')
    }
  }

  private async persistSubmittedReview(
    workflow: WorkflowRecord,
    dto: SubmitSprintReverseReviewWorkflowDTO,
    trx: TransactionClientContract,
    now: DateTime
  ): Promise<void> {
    if (workflow.target_type === 'assigner') {
      if (!workflow.target_user_id) {
        throw new BusinessLogicException('Review người giao việc target is missing')
      }
      await trx.table('sprint_manager_reviews').insert({
        id: randomUUID(),
        package_id: workflow.package_id,
        target_user_id: workflow.target_user_id,
        target_role: 'assigner',
        rating: dto.rating,
        dimensions: JSON.stringify(null),
        comment: dto.comment.trim(),
        is_anonymous_to_target: true,
        created_at: now.toSQL(),
        updated_at: now.toSQL(),
      })
      return
    }

    await trx.table('sprint_environment_reviews').insert({
      id: randomUUID(),
      package_id: workflow.package_id,
      target_type: 'organization',
      target_id: workflow.organization_id,
      rating: dto.rating,
      dimensions: JSON.stringify(null),
      comment: dto.comment.trim(),
      is_anonymous_publicly: true,
      created_at: now.toSQL(),
      updated_at: now.toSQL(),
    })
  }
}
