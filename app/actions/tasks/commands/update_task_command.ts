import type Task from '#models/task'
import TaskRepository from '#infra/tasks/repositories/task_repository'
import UserRepository from '#infra/users/repositories/user_repository'
import OrganizationUserRepository from '#infra/organizations/repositories/organization_user_repository'
import ProjectRepository from '#infra/projects/repositories/project_repository'
import CreateAuditLog from '#actions/common/create_audit_log'
import TaskVersionRepository from '#infra/tasks/repositories/task_version_repository'
import type UpdateTaskDTO from '../dtos/request/update_task_dto.js'
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
import { enforcePolicy } from '#actions/shared/enforce_policy'
import { canUpdateTaskFields } from '#domain/tasks/task_permission_policy'
import { validateAssignee } from '#domain/tasks/task_assignment_rules'
import { buildTaskPermissionContext } from '#actions/tasks/support/task_permission_context_builder'
import {
  BACKEND_NOTIFICATION_ENTITY_TYPES,
  BACKEND_NOTIFICATION_TYPES,
} from '#constants/notification_constants'
import CreateNotification from '#actions/common/create_notification'

const VERSION_TRACKED_FIELDS = [
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
] as const

interface PersistedTaskUpdate {
  task: Task
  oldAssignedTo: DatabaseId | null
  oldValues: Record<string, unknown>
  changes: ReturnType<UpdateTaskDTO['getChangesForAudit']>
}

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
    private createNotification: CreateNotification = new CreateNotification()
  ) {}

  /**
   * Execute command để cập nhật task
   *
   * Di chuyển logic từ database triggers:
   * - before_task_update: Validate assignee thuộc org
   * - task_version_after_update: Tạo version history khi có thay đổi
   */
  async execute(taskId: DatabaseId, dto: UpdateTaskDTO): Promise<Task> {
    const userId = this.requireUserId()
    this.ensureHasUpdates(dto)
    const updateResult = await this.persistTaskUpdateInTransaction(taskId, dto, userId)
    await this.runPostCommitEffects(updateResult, userId, dto)
    return await TaskRepository.findByIdWithWriteRelations(updateResult.task.id)
  }

  private requireUserId(): DatabaseId {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException()
    }

    return userId
  }

  private ensureHasUpdates(dto: UpdateTaskDTO): void {
    if (!dto.hasUpdates()) {
      throw new BusinessLogicException('Không có thay đổi nào để cập nhật')
    }
  }

  private async loadExistingTask(
    taskId: DatabaseId,
    dto: UpdateTaskDTO,
    trx: TransactionClientContract
  ): Promise<Task> {
    const existingTask = await TaskRepository.findActiveForUpdate(taskId, trx)

    if (existingTask.organization_id !== this.execCtx.organizationId) {
      throw new ForbiddenException('Task không thuộc tổ chức hiện tại')
    }

    if (dto.project_id !== undefined) {
      await ProjectRepository.validateBelongsToOrg(
        dto.project_id,
        existingTask.organization_id,
        trx
      )
    }

    return existingTask
  }

  private async ensureAssigneeBoundary(
    task: Task,
    dto: UpdateTaskDTO,
    trx: TransactionClientContract
  ): Promise<void> {
    if (dto.assigned_to === undefined || dto.assigned_to === null) {
      return
    }

    const isApproved = await OrganizationUserRepository.isApprovedMember(
      dto.assigned_to,
      task.organization_id,
      trx
    )
    const isFreelancer = await UserRepository.isFreelancer(dto.assigned_to, trx)

    enforcePolicy(
      validateAssignee({
        isOrgMember: isApproved,
        isFreelancer,
        taskVisibility: task.task_visibility,
      })
    )
  }

  private async ensureFieldPermissions(
    userId: DatabaseId,
    task: Task,
    dto: UpdateTaskDTO,
    trx: TransactionClientContract
  ): Promise<void> {
    const permissionContext = await buildTaskPermissionContext(userId, task, trx)
    const fieldsResult = canUpdateTaskFields(permissionContext, dto.getUpdatedFields())

    if (!fieldsResult.allowed) {
      throw new ForbiddenException(fieldsResult.reason)
    }
  }

  private async persistTaskUpdate(
    task: Task,
    dto: UpdateTaskDTO,
    userId: DatabaseId,
    trx: TransactionClientContract
  ): Promise<PersistedTaskUpdate> {
    const oldValues = task.toJSON()
    const oldAssignedTo = task.assigned_to

    task.merge(dto.toObject())
    await TaskRepository.save(task, trx)

    const changes = dto.getChangesForAudit(oldValues)
    await this.recordTaskUpdatedAudit(task.id, oldValues, task.toJSON(), userId)
    await this.createTaskVersion(task, oldValues, userId, trx)

    return {
      task,
      oldAssignedTo,
      oldValues,
      changes,
    }
  }

  private async persistTaskUpdateInTransaction(
    taskId: DatabaseId,
    dto: UpdateTaskDTO,
    userId: DatabaseId
  ): Promise<PersistedTaskUpdate> {
    const trx = await db.transaction()

    try {
      const existingTask = await this.loadExistingTask(taskId, dto, trx)
      await this.ensureAssigneeBoundary(existingTask, dto, trx)
      await this.ensureFieldPermissions(userId, existingTask, dto, trx)
      const updateResult = await this.persistTaskUpdate(existingTask, dto, userId, trx)
      await trx.commit()
      return updateResult
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }

  private async recordTaskUpdatedAudit(
    taskId: DatabaseId,
    oldValues: Record<string, unknown>,
    newValues: Record<string, unknown>,
    userId: DatabaseId
  ): Promise<void> {
    await new CreateAuditLog(this.execCtx).handle({
      user_id: userId,
      action: AuditAction.UPDATE,
      entity_type: EntityType.TASK,
      entity_id: taskId,
      old_values: oldValues,
      new_values: newValues,
    })
  }

  private async runPostCommitEffects(
    updateResult: PersistedTaskUpdate,
    userId: DatabaseId,
    dto: UpdateTaskDTO
  ): Promise<void> {
    void emitter.emit('task:updated', {
      task: updateResult.task,
      updatedBy: userId,
      changes: updateResult.changes,
      previousValues: updateResult.oldValues,
    })

    await this.invalidateTaskCaches(updateResult.task.id)
    await this.sendNotifications(updateResult.task, userId, dto, updateResult.oldAssignedTo)
  }

  private async invalidateTaskCaches(taskId: DatabaseId): Promise<void> {
    await CacheService.deleteByPattern(`task:${taskId}:*`)
    await CacheService.deleteByPattern('organization:tasks:*')
    await CacheService.deleteByPattern('task:user:*')
  }

  /**
   * Send notifications cho các thay đổi
   */
  private async sendNotifications(
    task: Task,
    updaterId: DatabaseId,
    dto: UpdateTaskDTO,
    oldAssignedTo: DatabaseId | null
  ): Promise<void> {
    try {
      const updater = await UserRepository.findById(updaterId)
      const updaterName = updater?.username ?? updater?.email ?? 'Unknown'

      if (dto.hasAssigneeChange() && task.assigned_to && task.assigned_to !== oldAssignedTo) {
        if (task.assigned_to !== updaterId) {
          const assignee = await UserRepository.findById(task.assigned_to)
          if (assignee) {
            await this.createNotification.handle({
              user_id: assignee.id,
              title: 'Bạn có nhiệm vụ mới',
              message: `${updaterName} đã giao cho bạn nhiệm vụ: ${task.title}`,
              type: BACKEND_NOTIFICATION_TYPES.TASK_ASSIGNED,
              related_entity_type: BACKEND_NOTIFICATION_ENTITY_TYPES.TASK,
              related_entity_id: task.id,
            })
          }
        }
      }

      if (dto.isUnassigning() && oldAssignedTo && oldAssignedTo !== updaterId) {
        const oldAssignee = await UserRepository.findById(oldAssignedTo)
        if (oldAssignee) {
          await this.createNotification.handle({
            user_id: oldAssignee.id,
            title: 'Cập nhật nhiệm vụ',
            message: `${updaterName} đã bỏ giao nhiệm vụ: ${task.title}`,
            type: BACKEND_NOTIFICATION_TYPES.TASK_UPDATED,
            related_entity_type: BACKEND_NOTIFICATION_ENTITY_TYPES.TASK,
            related_entity_id: task.id,
          })
        }
      }
    } catch (error) {
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
    const newValues = task.toJSON() as Record<string, unknown>
    const hasChanges = VERSION_TRACKED_FIELDS.some((field) => {
      const oldVal = oldValues[field]
      const newVal = newValues[field]
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
