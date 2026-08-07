import type AppException from '#modules/errors/public_contracts/application_exception'
import type { Result } from '#modules/errors/public_contracts/result'
import { BaseQuery } from '#modules/tasks/actions/base_query'
import type { TaskExternalDependencies } from '#modules/tasks/actions/ports/outbound/task_external_dependencies'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import {
  assertTaskCompletionPackageAccess,
  loadTaskForCompletionPackage,
} from '#modules/tasks/actions/task_completion_package_access'

export interface ListTaskAttachmentsInput {
  taskId: string
  page: number
  perPage: number
}

type ListTaskAttachmentsOutput = Awaited<
  ReturnType<TaskExternalDependencies['completion']['listAttachments']>
>

export default class ListTaskAttachmentsQuery extends BaseQuery<
  ListTaskAttachmentsInput,
  ListTaskAttachmentsOutput
> {
  constructor(
    private readonly context: TaskActionContext,
    private readonly dependencies: TaskExternalDependencies
  ) {
    super(context)
  }

  override executeAndWrap(
    input: ListTaskAttachmentsInput
  ): Promise<Result<ListTaskAttachmentsOutput, AppException>>
  override executeAndWrap(
    taskId: string,
    page: number,
    perPage: number
  ): Promise<Result<ListTaskAttachmentsOutput, AppException>>
  override executeAndWrap(
    inputOrTaskId: ListTaskAttachmentsInput | string,
    page?: number,
    perPage?: number
  ): Promise<Result<ListTaskAttachmentsOutput, AppException>> {
    const normalizedInput =
      typeof inputOrTaskId === 'string'
        ? { taskId: inputOrTaskId, page: page as number, perPage: perPage as number }
        : inputOrTaskId
    return super.executeAndWrap(normalizedInput)
  }

  async execute(taskId: string, page: number, perPage: number): Promise<ListTaskAttachmentsOutput> {
    return this.handle({ taskId, page, perPage })
  }

  async handle(input: ListTaskAttachmentsInput) {
    const task = await loadTaskForCompletionPackage(input.taskId, this.dependencies.completion)
    await assertTaskCompletionPackageAccess(this.context, task, [], this.dependencies.org)
    return this.dependencies.completion.listAttachments(
      input.taskId,
      (input.page - 1) * input.perPage,
      input.perPage
    )
  }
}
