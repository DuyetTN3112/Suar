import ForbiddenException from '#modules/errors/public_contracts/forbidden_exception'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { type NotificationFanoutStagerContract } from '#modules/notifications/public_contracts/notification_fanout'
import { BaseCommand } from '#modules/tasks/actions/base_command'
import {
  extractTaskCommentMentionTokens,
  mapResolvedTaskCommentMentions,
} from '#modules/tasks/actions/mappers/task-comments/task_comment_mention_mapper'
import type { TaskExternalDependencies } from '#modules/tasks/actions/ports/outbound/task_external_dependencies'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import {
  assertTaskCompletionPackageAccess,
  loadTaskForCompletionPackage,
} from '#modules/tasks/actions/task_completion_package_access'
import { canViewTask } from '#modules/tasks/domain/task-assignment/task_permission_policy'

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
  mentions: Array<{ userId: string; username: string; mentionToken: string }>
}

export default class CreateTaskCommentCommand extends BaseCommand<CreateTaskCommentDTO, TaskCommentResult> {
  constructor(
    protected override execCtx: TaskActionContext,
    private readonly dependencies: TaskExternalDependencies,
    private readonly notificationFanout: NotificationFanoutStagerContract
  ) {
    super(execCtx, dependencies.transactions)
  }

  override async handle(dto: CreateTaskCommentDTO): Promise<TaskCommentResult> {
    return this.execute(dto)
  }

  async execute(dto: CreateTaskCommentDTO): Promise<TaskCommentResult> {
    if (dto.body.trim().length === 0) {
      throw ValidationException.field('body', 'Task comment body is required')
    }

    const task = await loadTaskForCompletionPackage(dto.task_id, this.dependencies.completion)
    const actorId = await assertTaskCompletionPackageAccess(
      this.execCtx,
      task,
      [],
      this.dependencies.org
    )

    const [actorOrgRole, actorProjectRole, activeAssignment] = await Promise.all([
      this.dependencies.permission.getOrgRoleName(actorId, task.organization_id),
      task.project_id
        ? this.dependencies.permission.getProjectRoleName(actorId, task.project_id)
        : Promise.resolve(null),
      this.dependencies.activeAssignmentReader?.findActorAssignment(task.id, actorId) ??
        Promise.resolve(null),
    ])

    if (
      !canViewTask({
        actorId,
        actorOrgRole,
        actorProjectRole,
        taskCreatorId: task.creator_id,
        taskAssignedTo: task.assigned_to,
        taskOrganizationId: task.organization_id,
        taskProjectId: task.project_id ?? null,
        taskVisibility: task.task_visibility ?? null,
        isActiveAssignee: activeAssignment?.status === 'active',
      }).allowed
    ) {
      throw new ForbiddenException('User cannot comment on this task')
    }

    return this.dependencies.transactions.run(async (trx) => {
      const now = new Date()
      const mentionTokens = extractTaskCommentMentionTokens(dto.body)
      const mentionIdentities =
        mentionTokens.length > 0
          ? await this.dependencies.completion.findMentionedUsers(
              task.organization_id,
              mentionTokens,
              trx
            )
          : []
      const mentions = mapResolvedTaskCommentMentions(mentionTokens, mentionIdentities)

      if (dto.parent_comment_id) {
        const parent = await this.dependencies.completion.findParentComment(
          dto.parent_comment_id,
          dto.task_id,
          trx
        )

        if (!parent) {
          throw NotFoundException.resource('Parent task comment', dto.parent_comment_id)
        }
      }

      const created = await this.dependencies.completion.createComment(
        {
          task_id: dto.task_id,
          author_id: actorId,
          parent_comment_id: dto.parent_comment_id ?? null,
          body: dto.body.trim(),
          comment_type: dto.comment_type,
          visibility: dto.visibility,
          review_relevance: dto.review_relevance ?? dto.comment_type === 'review_note',
          created_at: now,
          updated_at: now,
        },
        trx
      )

      const commentId = String(created['id'])

      await this.dependencies.completion.replaceCommentMentions(
        commentId,
        actorId,
        mentions.map((mention) => ({
          userId: mention.userId,
          token: mention.token,
        })),
        trx
      )

      const recipientIds = mentions
        .map((mention) => mention.userId)
        .filter((recipientId) => recipientId !== actorId)
      if (recipientIds.length > 0) {
        await this.notificationFanout.stage(
          {
            eventName: 'task.comment_mentioned',
            businessEventId: commentId,
            type: 'task_mentioned',
            schemaVersion: 1,
            scope: { kind: 'organization', id: task.organization_id },
            actor: { type: 'user', id: actorId },
            subject: { type: 'task', id: dto.task_id },
            parameters: { commentId },
            occurredAt: now.toISOString(),
            ...(this.execCtx.requestId ? { correlationId: this.execCtx.requestId } : {}),
          },
          recipientIds,
          { trx, now }
        )
      }

      return {
        ...created,
        mentions: mentions.map((mention) => ({
          userId: mention.userId,
          username: mention.username,
          mentionToken: mention.token,
        })),
      } as unknown as TaskCommentResult
    })
  }
}
