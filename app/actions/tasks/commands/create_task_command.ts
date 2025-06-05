import Task from '#models/task'
import User from '#models/user'
import UserRepository from '#repositories/user_repository'
import OrganizationRepository from '#repositories/organization_repository'
import OrganizationUserRepository from '#repositories/organization_user_repository'
import ProjectMemberRepository from '#repositories/project_member_repository'
import ProjectRepository from '#repositories/project_repository'
import TaskStatusRepository from '#repositories/task_status_repository'
import AuditLog from '#models/mongo/audit_log'
import type CreateTaskDTO from '../dtos/create_task_dto.js'
import type CreateNotification from '#actions/common/create_notification'
import logger from '@adonisjs/core/services/logger'
import type { ExecutionContext } from '#types/execution_context'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import BusinessLogicException from '#exceptions/business_logic_exception'
import { AuditAction, EntityType } from '#constants/audit_constants'
import { TaskStatus } from '#constants/task_constants'
import CacheService from '#services/cache_service'
import emitter from '@adonisjs/core/services/emitter'
import type { DatabaseId } from '#types/database'
import { enforcePolicy } from '#actions/shared/rules/enforce_policy'
import { canCreateTask } from '#actions/tasks/rules/task_permission_policy'
import { validateTaskCreationFields } from '#actions/tasks/rules/task_assignment_rules'

/**
 * Command để tạo task mới
 *
 * Business Rules:
 * - organization_id là bắt buộc (từ session)
 * - creator_id tự động set từ auth.user
 * - Notification gửi cho assignee nếu task được giao
 * - Audit log đầy đủ
 * - Transaction để ensure data consistency
 *
 * Permissions:
 * - User phải đăng nhập
 * - User phải thuộc organization
 * - Có thể thêm permission check (admin/member) nếu cần
 */
export default class CreateTaskCommand {
  constructor(
    protected execCtx: ExecutionContext,
    private createNotification: CreateNotification
  ) {}

  /**
   * Execute command để tạo task
   *
   * Di chuyển logic từ database procedure create_task:
   * 1. Check creator active
   * 2. Check org exists
   * 3. Check permission (admin/owner OR project_manager)
   * 4. Validate project thuộc org
   * 5. Validate status/label/priority exists
   * 6. Validate due_date not past
   */
  async execute(dto: CreateTaskDTO): Promise<Task> {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException()
    }
    const trx = await db.transaction()

    try {
      // 1. Check creator active (Fat Model method)
      await UserRepository.findActiveOrFail(userId, trx)

      // 2. Check org exists (Fat Model method)
      await OrganizationRepository.findActiveOrFail(dto.organization_id, trx)

      // 3. Check permission: admin/owner OR project_manager (pure rule)
      const isOrgAdmin = await OrganizationUserRepository.isAdminOrOwner(userId, dto.organization_id, trx)
      let isProjectManager = false
      if (!isOrgAdmin && dto.project_id) {
        isProjectManager = await ProjectMemberRepository.isProjectManagerOrOwner(userId, dto.project_id, trx)
      }
      enforcePolicy(
        canCreateTask({
          isOrgAdminOrOwner: isOrgAdmin,
          isProjectManagerOrOwner: isProjectManager,
          hasProjectId: dto.project_id !== null && dto.project_id !== undefined,
        })
      )

      // 4. Validate project thuộc org (Fat Model method)
      if (dto.project_id) {
        await ProjectRepository.validateBelongsToOrg(dto.project_id, dto.organization_id, trx)
      }

      // 5. Validate creation fields via pure rule
      enforcePolicy(
        validateTaskCreationFields({
          status: dto.status ? String(dto.status) : null,
          label: dto.label ? String(dto.label) : null,
          priority: dto.priority ? String(dto.priority) : null,
          isDueDateInPast: dto.due_date ? dto.due_date < DateTime.now() : false,
        })
      )

      // 9. Validate assignee (Fat Model methods)
      if (dto.assigned_to) {
        const isMember = await OrganizationUserRepository.isApprovedMember(
          dto.assigned_to,
          dto.organization_id,
          trx
        )
        if (!isMember) {
          const isFreelancer = await UserRepository.isFreelancer(dto.assigned_to, trx)
          if (!isFreelancer) {
            throw new BusinessLogicException('Người được gán phải thuộc tổ chức hoặc là freelancer')
          }
        }
      }

      // 9b. Resolve task_status_id: use org's default status (v4)
      let taskStatusId: string | null = null
      const defaultStatus = await TaskStatusRepository.findDefault(dto.organization_id, trx)
      if (defaultStatus) {
        taskStatusId = defaultStatus.id
      }

      // 10. Create task
      const newTask = await Task.create(
        {
          title: dto.title,
          description: dto.description || '',
          status: dto.status || (defaultStatus?.slug ?? TaskStatus.TODO),
          task_status_id: taskStatusId,
          label: dto.label || undefined,
          priority: dto.priority || undefined,
          assigned_to: dto.assigned_to ? String(dto.assigned_to) : null,
          due_date: dto.due_date,
          parent_task_id: dto.parent_task_id ? String(dto.parent_task_id) : null,
          estimated_time: dto.estimated_time,
          actual_time: dto.actual_time,
          project_id: dto.project_id ? String(dto.project_id) : null,
          organization_id: String(dto.organization_id),
          creator_id: String(userId),
        },
        { client: trx }
      )

      // 5. Create audit log
      await AuditLog.create({
        user_id: userId,
        action: AuditAction.CREATE,
        entity_type: EntityType.TASK,
        entity_id: newTask.id,
        new_values: newTask.toJSON(),
        ip_address: this.execCtx.ip,
        user_agent: this.execCtx.userAgent,
      })

      await trx.commit()

      // Emit domain event
      void emitter.emit('task:created', {
        task: newTask,
        creatorId: userId,
        organizationId: dto.organization_id,
        projectId: dto.project_id ?? null,
      })

      // Invalidate task list and organization task caches
      await CacheService.deleteByPattern(`organization:tasks:*`)
      await CacheService.deleteByPattern(`tasks:public:*`)
      if (dto.project_id) {
        await CacheService.deleteByPattern(`task:user:*`)
      }

      // 6. Send notification if task is assigned (outside transaction)
      if (dto.isAssigned() && dto.assigned_to !== undefined) {
        await this.sendAssignmentNotification(newTask, userId, dto.assigned_to)
      }

      // Load relations for return (batch load để tránh N+1)
      await newTask.load((loader) => {
        loader
          .load('assignee')
          .load('creator')
          .load('organization')
          .load('project')
          .load('parentTask')
      })

      return newTask
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }

  /**
   * Send notification cho người được giao task
   */
  private async sendAssignmentNotification(
    task: Task,
    creatorId: DatabaseId,
    assigneeId: DatabaseId
  ): Promise<void> {
    try {
      // Don't notify if assigning to self
      if (assigneeId === creatorId) {
        return
      }

      const [assignee, creator] = await Promise.all([User.find(assigneeId), User.find(creatorId)])
      if (!assignee) {
        logger.warn(`[CreateTaskCommand] Assignee user not found: ${assigneeId}`)
        return
      }
      if (!creator) {
        logger.warn(`[CreateTaskCommand] Creator user not found: ${creatorId}`)
        return
      }

      await this.createNotification.handle({
        user_id: assignee.id,
        title: 'Bạn có nhiệm vụ mới',
        message: `${creator.username || creator.email} đã giao cho bạn nhiệm vụ mới: ${task.title}`,
        type: 'task_assigned',
        related_entity_type: 'task',
        related_entity_id: task.id,
      })

      logger.info(`[CreateTaskCommand] Notification sent to user ${assigneeId} for task ${task.id}`)
    } catch (error) {
      // Don't fail task creation if notification fails
      logger.error('[CreateTaskCommand] Failed to send assignment notification', { error })
    }
  }
}
