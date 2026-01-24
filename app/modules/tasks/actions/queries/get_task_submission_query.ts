import type { TaskExternalDependencies } from '#modules/tasks/actions/ports/outbound/task_external_dependencies'
import {
  assertTaskCompletionPackageAccess,
  loadTaskForCompletionPackage,
} from '#modules/tasks/actions/services/task_completion_access_resolver'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'

export default class GetTaskSubmissionQuery {
  constructor(
    private readonly context: TaskActionContext,
    private readonly dependencies: TaskExternalDependencies
  ) {}

  async execute(taskId: string) {
    const task = await loadTaskForCompletionPackage(taskId, this.dependencies.completion)
    await assertTaskCompletionPackageAccess(this.context, task, [], this.dependencies.org)
    return this.dependencies.completion.findSubmissionByTask(taskId)
  }
}
