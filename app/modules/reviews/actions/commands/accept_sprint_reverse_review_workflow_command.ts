import { randomUUID } from 'node:crypto'

import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'

import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import ForbiddenException from '#modules/http/exceptions/forbidden_exception'
import NotFoundException from '#modules/http/exceptions/not_found_exception'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'

export default class AcceptSprintReverseReviewWorkflowCommand {
  constructor(private readonly execCtx: ReviewActionContext) {}

  async execute(dto: { workflow_id: string }): Promise<{ id: string; status: string }> {
    const actorId = this.requireUserId()
    const trx = await db.transaction()

    try {
      const workflow = (await trx
        .from('sprint_reverse_review_workflows')
        .where('id', dto.workflow_id)
        .forUpdate()
        .first()) as
        | { id: string; reviewer_id: string; responder_id: string | null; status: string }
        | undefined
      if (!workflow) {
        throw new NotFoundException('Review sau sprint workflow not found')
      }
      if (workflow.reviewer_id !== actorId && workflow.responder_id !== actorId) {
        throw new ForbiddenException('Only workflow participants can accept review sau sprint')
      }
      if (!['awaiting_response', 'disputed'].includes(workflow.status)) {
        throw new BusinessLogicException('Review sau sprint workflow cannot be accepted now')
      }

      const now = DateTime.utc()
      await trx.from('sprint_reverse_review_workflows').where('id', workflow.id).update({
        status: 'done',
        accepted_at: now.toSQL(),
        updated_at: now.toSQL(),
      })
      await trx.table('sprint_reverse_review_messages').insert({
        id: randomUUID(),
        workflow_id: workflow.id,
        author_id: actorId,
        message_type: 'accept',
        body: 'Accepted review sau sprint outcome.',
        metadata: JSON.stringify({}),
        created_at: now.toSQL(),
      })

      await trx.commit()
      return { id: workflow.id, status: 'done' }
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
