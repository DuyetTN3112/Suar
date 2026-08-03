import type AppException from '#modules/errors/public_contracts/application_exception'
import type { Result } from '#modules/errors/public_contracts/result'
import { BaseQuery } from '#modules/tasks/actions/base_query'
import type { TaskExternalDependencies } from '#modules/tasks/actions/ports/outbound/task_external_dependencies'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import {
  assertTaskCompletionPackageAccess,
  loadTaskForCompletionPackage,
} from '#modules/tasks/actions/task_completion_package_access'

export interface ListTaskCommentsInput {
  taskId: string
  page: number
  perPage: number
}

type CommentPage = Awaited<
  ReturnType<TaskExternalDependencies['completion']['listCommentThreadPage']>
>
type CommentMention = Awaited<
  ReturnType<TaskExternalDependencies['completion']['loadCommentMentions']>
> extends Map<string, infer T>
  ? T
  : never
type ListTaskCommentsOutput = Omit<CommentPage, 'comments'> & {
  comments: Array<CommentPage['comments'][number] & { mentions: CommentMention }>
}

export default class ListTaskCommentsQuery extends BaseQuery<
  ListTaskCommentsInput,
  ListTaskCommentsOutput
> {
  constructor(
    private readonly context: TaskActionContext,
    private readonly dependencies: TaskExternalDependencies
  ) {
    super(context)
  }

  override executeAndWrap(
    input: ListTaskCommentsInput
  ): Promise<Result<ListTaskCommentsOutput, AppException>>
  override executeAndWrap(
    taskId: string,
    page: number,
    perPage: number
  ): Promise<Result<ListTaskCommentsOutput, AppException>>
  override executeAndWrap(
    inputOrTaskId: ListTaskCommentsInput | string,
    page?: number,
    perPage?: number
  ): Promise<Result<ListTaskCommentsOutput, AppException>> {
    const normalizedInput =
      typeof inputOrTaskId === 'string'
        ? { taskId: inputOrTaskId, page: page as number, perPage: perPage as number }
        : inputOrTaskId
    return super.executeAndWrap(normalizedInput)
  }

  async execute(taskId: string, page: number, perPage: number): Promise<ListTaskCommentsOutput> {
    return this.handle({ taskId, page, perPage })
  }

  async handle(input: ListTaskCommentsInput) {
    const task = await loadTaskForCompletionPackage(input.taskId, this.dependencies.completion)
    await assertTaskCompletionPackageAccess(this.context, task, [], this.dependencies.org)
    const result = await this.dependencies.completion.listCommentThreadPage(
      input.taskId,
      (input.page - 1) * input.perPage,
      input.perPage
    )
    const mentions = await this.dependencies.completion.loadCommentMentions(
      result.comments.map((comment) => String(comment['id']))
    )
    return {
      totalRootThreads: result.totalRootThreads,
      comments: result.comments.map((comment) => ({
        ...comment,
        mentions: mentions.get(String(comment['id'])) ?? [],
      })),
    }
  }
}
