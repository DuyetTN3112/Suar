import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import type { NotificationFanoutStagerContract } from '#modules/notifications/public_contracts/notification_fanout'
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

export interface UpdateTaskCommentDTO {
  task_id: string
  comment_id: string
  body?: string
  comment_type?: string
  visibility?: string
  review_relevance?: boolean
}

export default class UpdateTaskCommentCommand extends BaseCommand<
  UpdateTaskCommentDTO,
  Record<string, unknown>
> {
  constructor(
    private readonly context: TaskActionContext,
    private readonly dependencies: TaskExternalDependencies,
    private readonly notificationFanout: NotificationFanoutStagerContract
  ) {
    super(context, dependencies.transactions)
  }

  async handle(dto: UpdateTaskCommentDTO): Promise<Record<string, unknown>> {
    return this.execute(dto)
  }

  async execute(dto: UpdateTaskCommentDTO): Promise<Record<string, unknown>> {
    if (dto.body !== undefined && dto.body.trim().length === 0) {
      throw new BusinessLogicException('Task comment body is required')
    }

    const comment = await this.dependencies.completion.findComment(dto.comment_id, dto.task_id)
    if (!comment) {
      throw new NotFoundException('Task comment not found')
    }

    const task = await loadTaskForCompletionPackage(comment.task_id, this.dependencies.completion)
    const actorId = await assertTaskCompletionPackageAccess(
      this.context,
      task,
      [comment.author_id],
      this.dependencies.org
    )

    return this.dependencies.transactions.run(async (transaction) => {
      const lockedComment = await this.dependencies.completion.lockComment(comment.id, transaction)
      if (!lockedComment || lockedComment.task_id !== dto.task_id) {
        throw new NotFoundException('Task comment not found')
      }

      const now = new Date()
      const previousMentions = await this.dependencies.completion.loadCommentMentions(
        [lockedComment.id],
        transaction
      )
      const previousMentionedUserIds = new Set(
        (previousMentions.get(lockedComment.id) ?? []).map((mention) => mention.userId)
      )
      const mentions =
        dto.body === undefined
          ? null
          : await this.resolveMentions(task.organization_id, dto.body, transaction)
      const updated = await this.dependencies.completion.updateComment(
        lockedComment.id,
        {
          ...(dto.body !== undefined && { body: dto.body.trim() }),
          ...(dto.comment_type !== undefined && { comment_type: dto.comment_type }),
          ...(dto.visibility !== undefined && { visibility: dto.visibility }),
          ...(dto.review_relevance !== undefined && {
            review_relevance: dto.review_relevance,
          }),
          edited_at: now,
          updated_at: now,
        },
        transaction
      )

      if (mentions !== null) {
        await this.dependencies.completion.replaceCommentMentions(
          lockedComment.id,
          actorId,
          mentions.map((mention) => ({
            userId: mention.userId,
            token: mention.token,
          })),
          transaction
        )

        const newlyMentionedRecipientIds = mentions
          .map((mention) => mention.userId)
          .filter(
            (recipientId) => recipientId !== actorId && !previousMentionedUserIds.has(recipientId)
          )
        if (newlyMentionedRecipientIds.length > 0) {
          await this.notificationFanout.stage(
            {
              eventName: 'task.comment_mention_added',
              businessEventId: `${lockedComment.id}:${now.toISOString()}`,
              type: 'task_mentioned',
              schemaVersion: 1,
              scope: { kind: 'organization', id: task.organization_id },
              actor: { type: 'user', id: actorId },
              subject: { type: 'task', id: lockedComment.task_id },
              parameters: { commentId: lockedComment.id },
              occurredAt: now.toISOString(),
              ...(this.context.requestId ? { correlationId: this.context.requestId } : {}),
            },
            newlyMentionedRecipientIds,
            { trx: transaction, now }
          )
        }
      }

      const effectiveMentions =
        mentions === null
          ? (previousMentions.get(lockedComment.id) ?? [])
          : mentions.map((mention) => ({
              userId: mention.userId,
              username: mention.username,
              mentionToken: mention.token,
            }))

      return {
        ...updated,
        mentions: effectiveMentions,
      }
    })
  }

  private async resolveMentions(
    organizationId: string,
    body: string,
    transaction: Parameters<TaskExternalDependencies['completion']['findMentionedUsers']>[2]
  ) {
    const tokens = extractTaskCommentMentionTokens(body)
    const identities =
      tokens.length > 0
        ? await this.dependencies.completion.findMentionedUsers(organizationId, tokens, transaction)
        : []

    return mapResolvedTaskCommentMentions(tokens, identities)
  }
}
