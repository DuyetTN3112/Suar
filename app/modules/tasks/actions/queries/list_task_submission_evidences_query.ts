import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import type { TaskExternalDependencies } from '#modules/tasks/actions/ports/outbound/task_external_dependencies'
import {
  assertTaskCompletionPackageAccess,
  loadTaskForCompletionPackage,
} from '#modules/tasks/actions/services/task_completion_access_resolver'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'

export default class ListTaskSubmissionEvidencesQuery {
  constructor(
    private readonly context: TaskActionContext,
    private readonly dependencies: TaskExternalDependencies
  ) {}

  async execute(submissionId: string) {
    const submission = await this.dependencies.completion.findSubmissionById(submissionId)
    if (!submission) throw new NotFoundException('Task submission not found')
    const task = await loadTaskForCompletionPackage(
      submission.task_id,
      this.dependencies.completion
    )
    await assertTaskCompletionPackageAccess(
      this.context,
      task,
      [submission.submitted_by],
      this.dependencies.org
    )
    return this.dependencies.completion.listSubmissionEvidences(submissionId)
  }
}
