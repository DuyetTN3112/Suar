import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import type { TaskExternalDependencies } from '#modules/tasks/actions/ports/outbound/task_external_dependencies'
import {
  assertTaskCompletionPackageAccess,
  loadTaskForCompletionPackage,
} from '#modules/tasks/actions/services/task_completion_access_resolver'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'

export interface DeleteTaskCommentDTO {
  comment_id: string
}

export default class DeleteTaskCommentCommand {
  constructor(
    private execCtx: TaskActionContext,
    private readonly dependencies: TaskExternalDependencies
  ) {}

  async execute(dto: DeleteTaskCommentDTO): Promise<void> {
    const comment = await this.dependencies.completion.findComment(dto.comment_id)
    if (!comment) {
      throw new NotFoundException('Task comment not found')
    }

    const task = await loadTaskForCompletionPackage(comment.task_id, this.dependencies.completion)
    await assertTaskCompletionPackageAccess(
      this.execCtx,
      task,
      [comment.author_id],
      this.dependencies.org
    )

    await this.dependencies.completion.softDeleteComment(dto.comment_id, new Date())
  }
}
