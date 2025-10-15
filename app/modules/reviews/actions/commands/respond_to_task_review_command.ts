import { DateTime } from 'luxon'

import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import { BaseCommand } from '#modules/reviews/actions/base_command'
import { TASK_REVIEW_WORKFLOW_STATUSES } from '#modules/reviews/domain/task_review_workflow'

interface RespondToTaskReviewDTO {
  workflowId: string
  body: string
}

interface RevieweeResponseWorkflowRow {
  reviewee_id: string
}

export default class RespondToTaskReviewCommand extends BaseCommand<RespondToTaskReviewDTO, void> {
  async handle(dto: RespondToTaskReviewDTO): Promise<void> {
    const userId = this.getCurrentUserId()
    await this.executeInTransaction(async (trx) => {
      const workflow = (await trx
        .from('task_review_workflows')
        .where('id', dto.workflowId)
        .firstOrFail()) as RevieweeResponseWorkflowRow

      if (workflow.reviewee_id !== userId) {
        throw new BusinessLogicException('Chỉ người được review mới được phản hồi review')
      }

      await trx.table('task_review_messages').insert({
        workflow_id: dto.workflowId,
        author_id: userId,
        message_type: 'reviewee_response',
        body: dto.body,
      })
      await trx
        .from('task_review_workflows')
        .where('id', dto.workflowId)
        .update({
          status: TASK_REVIEW_WORKFLOW_STATUSES.DISPUTED,
          updated_at: DateTime.now().toSQL(),
        })
    })
  }

  async execute(dto: RespondToTaskReviewDTO): Promise<void> {
    return this.handle(dto)
  }
}
