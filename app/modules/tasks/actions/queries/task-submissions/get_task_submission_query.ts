import { BaseQuery } from '#modules/tasks/actions/base_query'
import type { TaskExternalDependencies } from '#modules/tasks/actions/ports/outbound/task_external_dependencies'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import {
  assertTaskCompletionPackageAccess,
  loadTaskForCompletionPackage,
} from '#modules/tasks/actions/task_completion_package_access'

type GetTaskSubmissionInput = { taskId: string }
type GetTaskSubmissionOutput = Awaited<
  ReturnType<TaskExternalDependencies['completion']['findSubmissionByTask']>
>

export default class GetTaskSubmissionQuery extends BaseQuery<
  GetTaskSubmissionInput,
  GetTaskSubmissionOutput
> {
  constructor(
    context: TaskActionContext,
    private readonly dependencies: TaskExternalDependencies
  ) {
    super(context)
  }

  override executeAndWrap(
    input: GetTaskSubmissionInput
  ): ReturnType<BaseQuery<GetTaskSubmissionInput, GetTaskSubmissionOutput>['executeAndWrap']>
  override executeAndWrap(
    taskId: string
  ): ReturnType<BaseQuery<GetTaskSubmissionInput, GetTaskSubmissionOutput>['executeAndWrap']>
  override executeAndWrap(
    inputOrTaskId: GetTaskSubmissionInput | string
  ): ReturnType<BaseQuery<GetTaskSubmissionInput, GetTaskSubmissionOutput>['executeAndWrap']> {
    const input = typeof inputOrTaskId === 'string' ? { taskId: inputOrTaskId } : inputOrTaskId
    return super.executeAndWrap(input)
  }

  async execute(taskId: string): Promise<GetTaskSubmissionOutput> {
    return this.handle({ taskId })
  }

  async handle({ taskId }: GetTaskSubmissionInput): Promise<GetTaskSubmissionOutput> {
    const task = await loadTaskForCompletionPackage(taskId, this.dependencies.completion)
    await assertTaskCompletionPackageAccess(this.execCtx, task, [], this.dependencies.org)
    return this.dependencies.completion.findSubmissionByTask(taskId)
  }
}
