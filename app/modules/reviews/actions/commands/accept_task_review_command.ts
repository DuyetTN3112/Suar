import { DateTime } from 'luxon'

import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import { BaseCommand } from '#modules/reviews/actions/base_command'
import { TASK_REVIEW_WORKFLOW_STATUSES } from '#modules/reviews/domain/task_review_workflow'

interface AcceptTaskReviewDTO {
  workflowId: string
}

interface RevieweeAcceptanceWorkflowRow {
  reviewee_id: string
  completed_review_count: number | string
  required_review_count: number | string
}

export default class AcceptTaskReviewCommand extends BaseCommand<AcceptTaskReviewDTO, void> {
  async handle(dto: AcceptTaskReviewDTO): Promise<void> {
    const userId = this.getCurrentUserId()
    await this.executeInTransaction(async (trx) => {
      const workflow = (await trx
        .from('task_review_workflows')
        .where('id', dto.workflowId)
        .firstOrFail()) as RevieweeAcceptanceWorkflowRow

      if (workflow.reviewee_id !== userId) {
        throw new BusinessLogicException('Chỉ người được review mới được đồng ý review')
      }
      if (Number(workflow.completed_review_count) < Number(workflow.required_review_count)) {
        throw new BusinessLogicException('Task chưa đủ số reviewer bắt buộc')
      }

      await trx
        .from('task_review_workflows')
        .where('id', dto.workflowId)
        .update({
          status: TASK_REVIEW_WORKFLOW_STATUSES.DONE,
          accepted_by_reviewee_at: DateTime.now().toSQL(),
          completed_at: DateTime.now().toSQL(),
          updated_at: DateTime.now().toSQL(),
        })
      await trx.table('task_review_messages').insert({
        workflow_id: dto.workflowId,
        author_id: userId,
        message_type: 'system',
        body: 'Reviewee accepted the review result.',
      })
    })
  }

  async execute(dto: AcceptTaskReviewDTO): Promise<void> {
    return this.handle(dto)
  }
}
