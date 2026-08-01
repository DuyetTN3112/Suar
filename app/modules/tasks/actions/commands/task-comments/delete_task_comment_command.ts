import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import { BaseCommand } from '#modules/tasks/actions/base_command'
import type { TaskExternalDependencies } from '#modules/tasks/actions/ports/outbound/task_external_dependencies'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import {
  assertTaskCompletionPackageAccess,
  loadTaskForCompletionPackage,
} from '#modules/tasks/actions/task_completion_package_access'

export interface DeleteTaskCommentDTO {
  comment_id: string
}

export default class DeleteTaskCommentCommand extends BaseCommand<DeleteTaskCommentDTO, void> {
  constructor(
    protected override execCtx: TaskActionContext,
    private readonly dependencies: TaskExternalDependencies
  ) {
    super(execCtx, dependencies.transactions)
  }

  override async handle(dto: DeleteTaskCommentDTO): Promise<void> {
    return this.execute(dto)
  }

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
