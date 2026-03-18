import { DateTime } from 'luxon'

import type DeleteTaskDTO from '../dtos/request/delete_task_dto.js'

import { AuditAction, EntityType } from '#modules/audit/public_contracts/audit_constants'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import {
  BACKEND_NOTIFICATION_ENTITY_TYPES,
  BACKEND_NOTIFICATION_TYPES,
} from '#modules/notifications/public_contracts/notification_constants'
import { buildNotificationEventId } from '#modules/notifications/public_contracts/notification_event_identity'
import type { TaskCachePort } from '#modules/tasks/actions/ports/outbound/task_cache_port'
import type { TaskEventPublisher } from '#modules/tasks/actions/ports/outbound/task_event_publisher'
import type { TaskExternalDependencies } from '#modules/tasks/actions/ports/outbound/task_external_dependencies'
import type { TaskNotificationStager } from '#modules/tasks/actions/ports/outbound/task_notification_stager'
import { buildTaskPermissionContext } from '#modules/tasks/actions/services/task_permission_context_resolver'
import { settleTaskPostCommitEffects } from '#modules/tasks/actions/services/task_post_commit_effect_settler'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import { canDeleteTask, canPermanentDeleteTask } from '#modules/tasks/domain/task_permission_policy'

/**
 * Command để xóa task
 *
 * Business Rules:
 * - Soft delete mặc định (set deleted_at)
 * - Hard delete chỉ dành cho Superadmin (optional feature)
 * - Không thể xóa task đã có actual hours (cần revoke trước)
 * - Không thể xóa task đã có review session
 * - Notify assignee và creator
 * - Audit log đầy đủ
 *
 * Pattern: FETCH → DECIDE → PERSIST
 */
export default class DeleteTaskCommand {
  constructor(
    protected execCtx: TaskActionContext,
    private taskExternalDependencies: TaskExternalDependencies,
    private notificationStager: TaskNotificationStager,
    private cache: TaskCachePort,
    private readonly taskEventPublisher: TaskEventPublisher
  ) {}

  /**
   * Execute command để xóa task
   */
  async execute(dto: DeleteTaskDTO): Promise<{ success: true; message: string }> {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException('Bạn cần đăng nhập để thực hiện hành động này')
    }

    const deletionResult =
      await this.taskExternalDependencies.transactions.run(async (trx) => {
      // ── FETCH ────────────────────────────────────────────────────────
      const task = await this.taskExternalDependencies.lifecycle.lockActiveTask(
        dto.task_id,
        trx
      )

      // ── DECIDE (pure, sync) ────────────────────────────────────────────
      const permissionContext = await buildTaskPermissionContext(
        userId,
        task,
        trx,
        this.taskExternalDependencies.permission
        , this.taskExternalDependencies.activeAssignmentReader
      )
      enforcePolicy(
        canDeleteTask({
          ...permissionContext,
          isActorOrgMember: permissionContext.actorOrgRole !== null,
        })
      )

      // Hard deletion is not available from the project workspace.
      if (dto.isPermanentDelete()) {
        enforcePolicy(canPermanentDeleteTask())
      }

      // ── Business rule: không thể xóa task đã có actual hours ──────────
      if (task.actual_time && task.actual_time > 0) {
        throw new BusinessLogicException(
          'Không thể xóa task đã có actual hours. Cần revoke task trước khi xóa.'
        )
      }

      // ── Business rule: không thể xóa task đã có review session ────────
      const hasReviewSession = await this.taskExternalDependencies.review.hasAnyReviewForTask(
        task.id,
        trx
      )
      if (hasReviewSession) {
        throw new BusinessLogicException(
          'Không thể xóa task đã có review session. Cần xử lý review trước khi xóa.'
        )
      }

      const hasTaskReviewWorkflow =
        await this.taskExternalDependencies.review.hasTaskReviewWorkflow(
          task.id,
          trx
        )
      if (hasTaskReviewWorkflow) {
        throw new BusinessLogicException(
          'Không thể xóa task đã vào review board. Task vẫn có thể chỉnh sửa nhưng không được xóa.'
        )
      }

      // ── PERSIST ────────────────────────────────────────────────────────
      const taskData = { ...task }
      const deletedAt = DateTime.utc()
      const occurredAt = deletedAt.toISO()
      if (!occurredAt) {
        throw new InvariantViolationException('Unable to establish task deletion occurrence time')
      }

      if (dto.isPermanentDelete()) {
        await this.taskExternalDependencies.lifecycle.hardDeleteTask(dto.task_id, trx)
      } else {
        await this.taskExternalDependencies.lifecycle.updateTask(
          dto.task_id,
          { deleted_at: deletedAt },
          trx
        )
      }

      await auditPublicApi.log(
        {
          user_id: userId,
          action: dto.isPermanentDelete() ? AuditAction.HARD_DELETE : AuditAction.DELETE,
          entity_type: EntityType.TASK,
          entity_id: dto.task_id,
          old_values: taskData,
        },
        this.execCtx,
        { trx, critical: true }
      )

      await this.stageDeletionNotifications(taskData, userId, dto, occurredAt, trx)
      return {
        permanentDelete: dto.isPermanentDelete(),
        organizationId: task.organization_id,
      }
    })

    await this.runPostCommitEffects(dto.task_id, userId, deletionResult.organizationId)
    return {
      success: true,
      message: deletionResult.permanentDelete
        ? 'Nhiệm vụ đã được xóa vĩnh viễn'
        : 'Nhiệm vụ đã được xóa',
    }
  }

  private async stageDeletionNotifications(
    task: {
      id: string
      title: string
      organization_id: string
      assigned_to: string | null
      creator_id: string
    },
    actorId: string,
    dto: DeleteTaskDTO,
    occurredAt: string,
    trx: Parameters<TaskNotificationStager['stage']>[1]['trx']
  ): Promise<void> {
    const recipients = new Set<string>()
    if (task.assigned_to && task.assigned_to !== actorId) {
      recipients.add(task.assigned_to)
    }
    if (task.creator_id !== actorId) {
      recipients.add(task.creator_id)
    }

    for (const recipientId of recipients) {
      await this.notificationStager.stage(
        {
          eventId: buildNotificationEventId({
            eventName: 'task.deleted',
            businessEventId: task.id,
            recipientId,
          }),
          type: BACKEND_NOTIFICATION_TYPES.TASK_DELETED,
          schemaVersion: 1,
          recipientId,
          scope: { kind: 'organization', id: task.organization_id },
          actor: { type: 'user', id: actorId },
          subject: {
            type: BACKEND_NOTIFICATION_ENTITY_TYPES.TASK,
            id: task.id,
          },
          parameters: {
            taskTitle: task.title,
            reason: dto.reason ?? null,
            permanent: dto.isPermanentDelete(),
          },
          occurredAt,
          correlationId: task.id,
        },
        { trx }
      )
    }
  }

  private async runPostCommitEffects(
    taskId: string,
    actorId: string,
    organizationId: string
  ): Promise<void> {
    await settleTaskPostCommitEffects({
      operation: 'task.delete',
      context: {
        taskId,
        actorId,
      },
      effects: [
        {
          name: `event.task_deleted.${taskId}`,
          run: () =>
            this.taskEventPublisher.publishTaskDeleted({
              taskId,
              deletedBy: actorId,
            }),
        },
        {
          name: `cache.task.invalidate_now.${taskId}`,
          run: () => this.cache.invalidateAfterTaskDeleted(taskId, organizationId),
        },
      ],
    })
  }
}
