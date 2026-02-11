import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import type { TaskExternalDependencies } from '#modules/tasks/actions/ports/outbound/task_external_dependencies'
import {
  assertTaskCompletionPackageAccess,
  loadTaskForCompletionPackage,
} from '#modules/tasks/actions/services/task_completion_access_resolver'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'

export default class LockTaskSubmissionCommand {
  constructor(
    private readonly context: TaskActionContext,
    private readonly dependencies: TaskExternalDependencies
  ) {}

  async execute(taskId: string) {
    const task = await loadTaskForCompletionPackage(taskId, this.dependencies.completion)
    await assertTaskCompletionPackageAccess(this.context, task, [], this.dependencies.org)

    return this.dependencies.transactions.run(async (transaction) => {
      const submission = await this.dependencies.completion.findSubmissionByTask(taskId)
      if (!submission) throw new NotFoundException('Task submission not found')
      if (submission.status === 'locked') {
        throw new BusinessLogicException('Task submission is already locked')
      }
      return this.dependencies.completion.lockSubmissionStatus(
        submission.id,
        'locked',
        new Date(),
        transaction
      )
    })
  }
}
