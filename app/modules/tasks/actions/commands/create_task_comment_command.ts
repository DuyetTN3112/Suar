import db from '@adonisjs/lucid/services/db'

import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import {
  BACKEND_NOTIFICATION_ENTITY_TYPES,
  BACKEND_NOTIFICATION_TYPES,
} from '#modules/notifications/public_contracts/notification_constants'
import { notificationPublicApi } from '#modules/notifications/public_contracts/notification_creator'
import {
  assertTaskCompletionPackageAccess,
  loadTaskForCompletionPackage,
} from '#modules/tasks/actions/commands/task_completion_package_access'
import {
  replaceTaskCommentMentions,
  resolveTaskCommentMentions,
} from '#modules/tasks/actions/support/task_comment_mentions'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'

export interface CreateTaskCommentDTO {
  task_id: string
  parent_comment_id?: string | null
  body: string
  comment_type: 'normal' | 'blocker' | 'clarification' | 'status_update' | 'review_note'
  visibility: 'internal' | 'public' | 'reviewers_only'
  review_relevance?: boolean
}

export interface TaskCommentResult extends CreateTaskCommentDTO {
  id: string
  author_id: string
}

export default class CreateTaskCommentCommand {
  constructor(private execCtx: TaskActionContext) {}

  async execute(dto: CreateTaskCommentDTO): Promise<TaskCommentResult> {
    if (dto.body.trim().length === 0) {
      throw new BusinessLogicException('Task comment body is required')
    }

    const task = await loadTaskForCompletionPackage(dto.task_id)
    const actorId = await assertTaskCompletionPackageAccess(this.execCtx, task)
    const mentions = await resolveTaskCommentMentions(task.organization_id, dto.body)

    if (dto.parent_comment_id) {
      const parent = (await db
        .from('task_comments')
        .where('id', dto.parent_comment_id)
        .where('task_id', dto.task_id)
        .whereNull('deleted_at')
        .first()) as Record<string, unknown> | undefined

      if (!parent) {
        throw new BusinessLogicException('Parent comment must belong to the same task')
      }
    }

    const [created] = (await db
      .table('task_comments')
      .insert({
        task_id: dto.task_id,
        author_id: actorId,
        parent_comment_id: dto.parent_comment_id ?? null,
        body: dto.body.trim(),
        comment_type: dto.comment_type,
        visibility: dto.visibility,
        review_relevance: dto.review_relevance ?? dto.comment_type === 'review_note',
      })
      .returning('*')) as Record<string, unknown>[]

    if (!created) {
      throw new BusinessLogicException('Task comment could not be created')
    }

    await replaceTaskCommentMentions(
      String(created['id']),
      actorId,
      mentions.map((mention) => ({
        userId: mention.userId,
        token: mention.token,
      }))
    )

    for (const mention of mentions) {
      if (mention.userId === actorId) {
        continue
      }

      await notificationPublicApi.handle({
        user_id: mention.userId,
        type: BACKEND_NOTIFICATION_TYPES.TASK_MENTIONED,
        title: 'Bạn được nhắc trong thảo luận task',
        message: `@${mention.username} được nhắc trong task comment`,
        related_entity_type: BACKEND_NOTIFICATION_ENTITY_TYPES.TASK,
        related_entity_id: dto.task_id,
      })
    }

    return created as unknown as TaskCommentResult
  }
}
