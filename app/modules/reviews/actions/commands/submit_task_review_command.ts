import { DateTime } from 'luxon'

import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import { BaseCommand } from '#modules/reviews/actions/base_command'
import { TASK_REVIEW_WORKFLOW_STATUSES } from '#modules/reviews/domain/task_review_workflow'

interface SubmitTaskReviewDTO {
  workflowId: string
  body: string
}

interface SubmitReviewWorkflowRow {
  task_id: string
  required_review_count: number | string
}

interface SubmitReviewTaskRow {
  assigned_to: string | null
}

interface TaskReviewReviewerRow {
  id: string
  status: string
}

interface CountRow {
  total?: number | string
}

export default class SubmitTaskReviewCommand extends BaseCommand<SubmitTaskReviewDTO, void> {
  async handle(dto: SubmitTaskReviewDTO): Promise<void> {
    const reviewerId = this.getCurrentUserId()
    await this.executeInTransaction(async (trx) => {
      const workflow = (await trx
        .from('task_review_workflows')
        .where('id', dto.workflowId)
        .firstOrFail()) as SubmitReviewWorkflowRow
      const task = (await trx
        .from('tasks')
        .where('id', workflow.task_id)
        .whereNull('deleted_at')
        .select('assigned_to')
        .firstOrFail()) as SubmitReviewTaskRow

      if (task.assigned_to === reviewerId) {
        throw new BusinessLogicException('Bạn không thể review task được giao cho chính mình')
      }

      const reviewer = (await trx
        .from('task_review_reviewers')
        .where('workflow_id', dto.workflowId)
        .where('reviewer_id', reviewerId)
        .first()) as TaskReviewReviewerRow | null

      if (!reviewer) {
        throw new BusinessLogicException('Bạn không nằm trong danh sách reviewer của task này')
      }
      if (reviewer.status === 'submitted') {
        throw new BusinessLogicException('Bạn đã review task này rồi')
      }

      await trx.from('task_review_reviewers').where('id', reviewer.id).update({
        status: 'submitted',
        reviewed_at: DateTime.now().toSQL(),
        updated_at: DateTime.now().toSQL(),
      })
      await trx.table('task_review_messages').insert({
        workflow_id: dto.workflowId,
        author_id: reviewerId,
        message_type: 'review',
        body: dto.body,
      })

      const submittedRows = (await trx
        .from('task_review_reviewers')
        .where('workflow_id', dto.workflowId)
        .where('status', 'submitted')
        .count('* as total')
        .first()) as CountRow | null
      const completedReviewCount = Number(submittedRows?.total ?? 0)
      const requiredReviewCount = Number(workflow.required_review_count)

      await trx
        .from('task_review_workflows')
        .where('id', dto.workflowId)
        .update({
          completed_review_count: completedReviewCount,
          status:
            completedReviewCount >= requiredReviewCount
              ? TASK_REVIEW_WORKFLOW_STATUSES.AWAITING_RESPONSE
              : TASK_REVIEW_WORKFLOW_STATUSES.IN_REVIEW,
          updated_at: DateTime.now().toSQL(),
        })
    })
  }

  async execute(dto: SubmitTaskReviewDTO): Promise<void> {
    return this.handle(dto)
  }
}
