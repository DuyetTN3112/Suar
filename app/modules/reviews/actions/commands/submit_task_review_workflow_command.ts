import type EnsureTaskReviewWorkflowCommand from '#modules/reviews/actions/commands/ensure_task_review_workflow_command'
import type SubmitTaskReviewCommand from '#modules/reviews/actions/commands/submit_task_review_command'
import type { TaskReviewWorkflowOutcome } from '#modules/reviews/actions/dtos/task_review_workflow_outcome'

export interface SubmitTaskReviewWorkflowInput {
  taskId: string
  body: string
}

/**
 * Owns the complete "submit a review for a task" intent.
 *
 * Ensuring the workflow and recording the review remain separate reusable
 * mutations, while this command owns their externally visible ordering/result.
 */
export default class SubmitTaskReviewWorkflowCommand {
  constructor(
    private readonly ensureWorkflow: EnsureTaskReviewWorkflowCommand,
    private readonly submitReview: SubmitTaskReviewCommand
  ) {}

  async execute(input: SubmitTaskReviewWorkflowInput): Promise<TaskReviewWorkflowOutcome> {
    const workflow = await this.ensureWorkflow.execute({ taskId: input.taskId })

    return this.submitReview.execute({
      workflowId: workflow.workflowId,
      body: input.body,
    })
  }
}
