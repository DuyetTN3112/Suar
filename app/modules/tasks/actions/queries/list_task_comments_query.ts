import type { TaskExternalDependencies } from '#modules/tasks/actions/ports/outbound/task_external_dependencies'
import {
  assertTaskCompletionPackageAccess,
  loadTaskForCompletionPackage,
} from '#modules/tasks/actions/services/task_completion_access_resolver'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'

export default class ListTaskCommentsQuery {
  constructor(
    private readonly context: TaskActionContext,
    private readonly dependencies: TaskExternalDependencies
  ) {}

  async execute(taskId: string, page: number, perPage: number) {
    const task = await loadTaskForCompletionPackage(taskId, this.dependencies.completion)
    await assertTaskCompletionPackageAccess(this.context, task, [], this.dependencies.org)
    const result = await this.dependencies.completion.listCommentThreadPage(
      taskId,
      (page - 1) * perPage,
      perPage
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
