import { BaseCommand } from '#modules/reviews/actions/base_command'
import type EnsureTaskReviewWorkflowCommand from '#modules/reviews/actions/commands/task-review/ensure_task_review_workflow_command'
import type SubmitTaskReviewCommand from '#modules/reviews/actions/commands/task-review/submit_task_review_command'
import type { TaskReviewWorkflowOutcome } from '#modules/reviews/actions/dtos/task_review_workflow_outcome'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'

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
export default class SubmitTaskReviewWorkflowCommand extends BaseCommand<
  SubmitTaskReviewWorkflowInput,
  TaskReviewWorkflowOutcome
> {
  constructor(
    execCtx: ReviewActionContext,
    private readonly ensureWorkflow: EnsureTaskReviewWorkflowCommand,
    private readonly submitReview: SubmitTaskReviewCommand
  ) {
    super(execCtx)
  }

  async execute(input: SubmitTaskReviewWorkflowInput): Promise<TaskReviewWorkflowOutcome> {
    return this.handle(input)
  }

  async handle(input: SubmitTaskReviewWorkflowInput): Promise<TaskReviewWorkflowOutcome> {
    const workflow = await this.ensureWorkflow.requireSingleNativeWorkflowForTask(input.taskId)

    return this.submitReview.execute({
      workflowId: workflow.workflowId,
      body: input.body,
    })
  }
}
