import Task from '#models/task'
import User from '#models/user'
import UserRepository from '#repositories/user_repository'
import OrganizationUserRepository from '#repositories/organization_user_repository'
import AuditLog from '#models/mongo/audit_log'
import TaskVersionRepository from '#repositories/task_version_repository'
import type UpdateTaskDTO from '../dtos/update_task_dto.js'
import type CreateNotification from '#actions/common/create_notification'
import type { ExecutionContext } from '#types/execution_context'
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { AuditAction, EntityType } from '#constants/audit_constants'
import CacheService from '#services/cache_service'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import ForbiddenException from '#exceptions/forbidden_exception'
import BusinessLogicException from '#exceptions/business_logic_exception'
import emitter from '@adonisjs/core/services/emitter'
import loggerService from '#services/logger_service'
import type { DatabaseId } from '#types/database'
import { enforcePolicy } from '#actions/shared/rules/enforce_policy'
import { canUpdateTaskFields } from '#actions/tasks/rules/task_permission_policy'
import { validateAssignee } from '#actions/tasks/rules/task_assignment_rules'

/**
 * Command để cập nhật task
 *
 * Business Rules:
 * - Task phải thuộc organization hiện tại
 * - Permission-based updates with field-level restrictions
 * - Track old values cho audit
 * - Version history
 * - Notifications
 *
 * Pattern: FETCH → DECIDE → PERSIST
 */
export default class UpdateTaskCommand {
  constructor(
    protected execCtx: ExecutionContext,
    private createNotification: CreateNotification
  ) {}

  /**
   * Execute command để cập nhật task
   *
   * Di chuyển logic từ database triggers:
   * - before_task_update: Validate assignee thuộc org
   * - task_version_after_update: Tạo version history khi có thay đổi
   */
  async execute(taskId: DatabaseId, dto: UpdateTaskDTO): Promise<Task> {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException()
    }

    // Check if DTO has any updates
    if (!dto.hasUpdates()) {
      throw new BusinessLogicException('Không có thay đổi nào để cập nhật')
    }

    // Start transaction
    const trx = await db.transaction()

    try {
      // ── FETCH ──────────────────────────────────────────────────────────
      const existingTask = await Task.query({ client: trx })
        .where('id', taskId)
        .whereNull('deleted_at')
        .forUpdate()
        .firstOrFail()

      // Validate task thuộc organization hiện tại
      if (existingTask.organization_id !== this.execCtx.organizationId) {
        throw new ForbiddenException('Task không thuộc tổ chức hiện tại')
      }

      // Validate assignee thuộc org (logic từ before_task_update trigger)
      if (dto.assigned_to !== undefined && dto.assigned_to !== null) {
        const [isApproved, isFreelancer] = await Promise.all([
          OrganizationUserRepository.isApprovedMember(dto.assigned_to, existingTask.organization_id, trx),
          UserRepository.isFreelancer(dto.assigned_to, trx),
        ])

        enforcePolicy(
          validateAssignee({
            isOrgMember: isApproved,
            isFreelancer,
            taskVisibility: existingTask.task_visibility ?? 'internal',
          })
        )
      }

      const [systemRole, orgRole] = await Promise.all([
        UserRepository.getSystemRoleName(userId),
        OrganizationUserRepository.getMemberRoleName(existingTask.organization_id, userId, undefined, false),
      ])

      // ── DECIDE (pure, sync) ────────────────────────────────────────────
      const fieldsResult = canUpdateTaskFields(
        {
          actorId: userId,
          actorSystemRole: systemRole,
          actorOrgRole: orgRole,
          actorProjectRole: null,
          taskCreatorId: existingTask.creator_id,
          taskAssignedTo: existingTask.assigned_to,
          taskOrganizationId: existingTask.organization_id,
          taskProjectId: existingTask.project_id,
          isActiveAssignee: false,
        },
        dto.getUpdatedFields()
      )

      if (!fieldsResult.allowed) {
        throw new ForbiddenException(fieldsResult.reason)
      }

      // ── PERSIST ────────────────────────────────────────────────────────
      const oldValues = existingTask.toJSON()
      const oldAssignedTo = existingTask.assigned_to
      const oldStatus = existingTask.status

      existingTask.merge(dto.toObject())
      await existingTask.save()

      const changes = dto.getChangesForAudit(oldValues)
      await AuditLog.create({
        user_id: userId,
        action: AuditAction.UPDATE,
        entity_type: EntityType.TASK,
        entity_id: taskId,
        old_values: oldValues,
        new_values: existingTask.toJSON(),
        ip_address: this.execCtx.ip,
        user_agent: this.execCtx.userAgent,
      })

      // Create task version (logic từ task_version_after_update trigger)
      await this.createTaskVersion(existingTask, oldValues, userId, trx)

      // Store old values for notifications (outside transaction)
      existingTask.$extras.oldAssignedTo = oldAssignedTo
      existingTask.$extras.oldStatus = oldStatus
      existingTask.$extras.changes = changes

      await trx.commit()

      // Emit domain event (replaces task_version_after_update trigger side-effects)
      void emitter.emit('task:updated', {
        task: existingTask,
        updatedBy: userId,
        changes: existingTask.$extras.changes as Record<string, unknown>,
        previousValues: oldValues as Record<string, unknown>,
      })

      // Invalidate task-related caches
      await CacheService.deleteByPattern(`task:${String(taskId)}:*`)
      await CacheService.deleteByPattern(`organization:tasks:*`)
      await CacheService.deleteByPattern(`task:user:*`)

      // Send notifications (outside transaction)
      await this.sendNotifications(existingTask, userId, dto)

      // Load full relations (v3: status/label/priority are inline columns)
      await existingTask.load((loader) => {
        loader
          .load('assignee')
          .load('creator')
          .load('updater')
          .load('organization')
          .load('project')
          .load('parentTask')
          .load('childTasks', (query) => {
            void query.whereNull('deleted_at')
          })
      })

      return existingTask
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }

  /**
   * Send notifications cho các thay đổi
   */
  private async sendNotifications(
    task: Task,
    updaterId: DatabaseId,
    dto: UpdateTaskDTO
  ): Promise<void> {
    try {
      const oldAssignedTo = task.$extras.oldAssignedTo as string | null | undefined
      const oldStatus = task.$extras.oldStatus as string | undefined

      // Load updater info for notification messages
      const updater = await User.find(updaterId)
      const updaterName = updater?.username ?? updater?.email ?? 'Unknown'

      // Notify new assignee if assignment changed
      if (dto.hasAssigneeChange() && task.assigned_to && task.assigned_to !== oldAssignedTo) {
        // Don't notify if assigning to self
        if (task.assigned_to !== updaterId) {
          const assignee = await User.find(task.assigned_to)
          if (assignee) {
            await this.createNotification.handle({
              user_id: assignee.id,
              title: 'Bạn có nhiệm vụ mới',
              message: `${updaterName} đã giao cho bạn nhiệm vụ: ${task.title}`,
              type: 'task_assigned',
              related_entity_type: 'task',
              related_entity_id: task.id,
            })
          }
        }
      }

      // Notify creator if status changed (and creator is not the updater)
      if (dto.hasStatusChange() && task.status !== oldStatus) {
        if (task.creator_id && task.creator_id !== updaterId) {
          await this.createNotification.handle({
            user_id: task.creator_id,
            title: 'Cập nhật nhiệm vụ',
            message: `${updaterName} đã cập nhật trạng thái nhiệm vụ: ${task.title}`,
            type: 'task_status_updated',
            related_entity_type: 'task',
            related_entity_id: task.id,
          })
        }
      }

      // Notify old assignee if unassigned
      if (dto.isUnassigning() && oldAssignedTo && oldAssignedTo !== updaterId) {
        const oldAssignee = await User.find(oldAssignedTo)
        if (oldAssignee) {
          await this.createNotification.handle({
            user_id: oldAssignee.id,
            title: 'Cập nhật nhiệm vụ',
            message: `${updaterName} đã bỏ giao nhiệm vụ: ${task.title}`,
            type: 'task_updated',
            related_entity_type: 'task',
            related_entity_id: task.id,
          })
        }
      }
    } catch (error) {
      // Don't fail update if notification fails
      this.logError('Failed to send update notifications', error)
    }
  }

  /**
   * Log error
   */
  private logError(message: string, error: unknown): void {
    loggerService.error(`[UpdateTaskCommand] ${message}`, error)
  }

  /**
   * Create task version when task is updated
   * Logic từ task_version_after_update trigger:
   *   IF NOT (NEW.title <=> OLD.title) OR NOT (NEW.description <=> OLD.description) OR ...
   *   THEN INSERT INTO task_versions (task_id, title, description, status_id, ...)
   */
  private async createTaskVersion(
    task: Task,
    oldValues: Record<string, unknown>,
    changedBy: DatabaseId,
    trx: TransactionClientContract
  ): Promise<void> {
    // Check if any tracked field changed
    const trackedFields = [
      'title',
      'description',
      'status',
      'label',
      'priority',
      'assigned_to',
      'due_date',
      'parent_task_id',
      'estimated_time',
      'actual_time',
      'organization_id',
    ]

    const hasChanges = trackedFields.some((field) => {
      const oldVal = oldValues[field]
      const newVal = task[field as keyof Task]
      return oldVal !== newVal
    })

    if (!hasChanges) return

    // Insert into task_versions → delegate to TaskVersion model
    const snapshot = oldValues as Record<string, string | null>
    await TaskVersionRepository.createSnapshot(
      {
        task_id: snapshot.id as string,
        title: snapshot.title as string,
        description: snapshot.description ?? null,
        status: snapshot.status as string,
        label: snapshot.label as string,
        priority: snapshot.priority as string,
        difficulty: snapshot.difficulty ?? null,
        assigned_to: snapshot.assigned_to ?? null,
        changed_by: changedBy,
      },
      trx
    )
  }
}
