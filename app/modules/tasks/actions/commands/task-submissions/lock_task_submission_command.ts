import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import { BaseCommand } from '#modules/tasks/actions/base_command'
import type { TaskExternalDependencies } from '#modules/tasks/actions/ports/outbound/task_external_dependencies'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import {
  assertTaskCompletionPackageAccess,
  loadTaskForCompletionPackage,
} from '#modules/tasks/actions/task_completion_package_access'
import { canLockTaskSubmission } from '#modules/tasks/domain/task-submissions/task_submission_rules'

type LockTaskSubmissionOutput = Awaited<
  ReturnType<TaskExternalDependencies['completion']['lockSubmissionStatus']>
>

export default class LockTaskSubmissionCommand extends BaseCommand<
  string,
  LockTaskSubmissionOutput
> {
  constructor(
    context: TaskActionContext,
    private readonly dependencies: TaskExternalDependencies
  ) {
    super(context, dependencies.transactions)
  }

  async execute(taskId: string): Promise<LockTaskSubmissionOutput> {
    return this.handle(taskId)
  }

  async handle(taskId: string): Promise<LockTaskSubmissionOutput> {
    const task = await loadTaskForCompletionPackage(taskId, this.dependencies.completion)
    const submission = await this.dependencies.completion.findSubmissionByTask(taskId)
    if (!submission) throw new NotFoundException('Task submission not found')

    await assertTaskCompletionPackageAccess(
      this.execCtx,
      task,
      [submission.submitted_by],
      this.dependencies.org
    )

    return this.dependencies.transactions.run(async (transaction) => {
      const lockedSubmission = await this.dependencies.completion.lockSubmission(
        submission.id,
        transaction
      )
      if (!lockedSubmission || lockedSubmission.task_id !== taskId) {
        throw new NotFoundException('Task submission not found')
      }

      const policyResult = canLockTaskSubmission(lockedSubmission.status)
      if (!policyResult.allowed) {
        throw new BusinessLogicException(policyResult.reason)
      }

      return this.dependencies.completion.lockSubmissionStatus(
        lockedSubmission.id,
        'locked',
        new Date(),
        transaction
      )
    })
  }
}
