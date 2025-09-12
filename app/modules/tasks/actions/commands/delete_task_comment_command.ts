import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'

import NotFoundException from '#modules/http/exceptions/not_found_exception'
import {
  assertTaskCompletionPackageAccess,
  loadTaskForCompletionPackage,
} from '#modules/tasks/actions/commands/task_completion_package_access'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'

export interface DeleteTaskCommentDTO {
  comment_id: string
}

export default class DeleteTaskCommentCommand {
  constructor(private execCtx: TaskActionContext) {}

  async execute(dto: DeleteTaskCommentDTO): Promise<void> {
    const comment = (await db
      .from('task_comments')
      .where('id', dto.comment_id)
      .whereNull('deleted_at')
      .first()) as { task_id: string; author_id: string } | undefined
    if (!comment) {
      throw new NotFoundException('Task comment not found')
    }

    const task = await loadTaskForCompletionPackage(comment.task_id)
    await assertTaskCompletionPackageAccess(this.execCtx, task, [comment.author_id])

    await db
      .from('task_comments')
      .where('id', dto.comment_id)
      .update({ deleted_at: DateTime.now().toSQL() })
  }
}
