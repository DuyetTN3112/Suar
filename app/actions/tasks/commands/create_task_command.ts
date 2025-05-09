import Task from '#models/task'
import User from '#models/user'
import AuditLog from '#models/audit_log'
import type CreateTaskDTO from '../dtos/create_task_dto.js'
import type CreateNotification from '#actions/common/create_notification'
import logger from '@adonisjs/core/services/logger'
import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { DateTime } from 'luxon'

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
    protected ctx: HttpContext,
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
    const user = this.ctx.auth.user
    if (!user) {
      throw new Error('Unauthorized')
    }
    const trx = await db.transaction()

    try {
      // 1. Check creator active (từ procedure)
      await this.validateCreatorActive(user.id, trx)

      // 2. Check org exists (từ procedure)
      await this.validateOrgExists(dto.organization_id, trx)

      // 3. Check permission: admin/owner OR project_manager (từ procedure)
      await this.validateCreateTaskPermission(user.id, dto.organization_id, dto.project_id, trx)

      // 4. Validate project thuộc org (từ trigger)
      if (dto.project_id) {
        await this.validateProjectOrganization(dto.project_id, dto.organization_id, trx)
      }

      // 5. Validate status_id exists (từ procedure)
      if (dto.status_id) {
        await this.validateStatusExists(dto.status_id, trx)
      }

      // 6. Validate label_id exists (từ procedure)
      if (dto.label_id) {
        await this.validateLabelExists(dto.label_id, trx)
      }

      // 7. Validate priority_id exists (từ procedure)
      if (dto.priority_id) {
        await this.validatePriorityExists(dto.priority_id, trx)
      }

      // 8. Validate due_date not past (từ procedure)
      if (dto.due_date && dto.due_date < DateTime.now()) {
        throw new Error('Due date không thể là thời điểm trong quá khứ')
      }

      // 9. Validate assignee (từ trigger)
      if (dto.assigned_to) {
        await this.validateAssignee(dto.assigned_to, dto.organization_id, trx)
      }

      // 10. Create task
      const newTask = await Task.create(
        {
          title: dto.title,
          description: dto.description,
          status_id: dto.status_id,
          label_id: dto.label_id,
          priority_id: dto.priority_id,
          assigned_to: dto.assigned_to,
          due_date: dto.due_date,
          parent_task_id: dto.parent_task_id,
          estimated_time: dto.estimated_time,
          actual_time: dto.actual_time,
          project_id: dto.project_id,
          organization_id: dto.organization_id,
          creator_id: user.id,
        },
        { client: trx }
      )

      // 5. Create audit log
      await AuditLog.create(
        {
          user_id: user.id,
          action: 'create',
          entity_type: 'task',
          entity_id: newTask.id,
          new_values: newTask.toJSON(),
          ip_address: this.ctx.request.ip(),
          user_agent: this.ctx.request.header('user-agent'),
        },
        { client: trx }
      )

      await trx.commit()

      // 6. Send notification if task is assigned (outside transaction)
      if (dto.isAssigned() && dto.assigned_to !== undefined) {
        await this.sendAssignmentNotification(newTask, user, dto.assigned_to)
      }

      // Load relations for return
      await newTask.load('status')
      await newTask.load('label')
      await newTask.load('priority')
      await newTask.load('assignee')
      await newTask.load('creator')
      await newTask.load('organization')
      await newTask.load('project')
      await newTask.load('parentTask')

      return newTask
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }

  /**
   * Validate creator thuộc organization
   * Logic từ check_creator_organization trigger:
   *   IF NOT EXISTS (SELECT 1 FROM organization_users WHERE user_id = NEW.creator_id AND organization_id = NEW.organization_id)
   *   THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Người tạo task phải thuộc tổ chức của task'
   */
  // @ts-expect-error - Validation method for future use
  private async _validateCreatorInOrganization(
    userId: number,
    organizationId: number,
    trx: TransactionClientContract
  ): Promise<void> {
    const membership = (await db
      .from('organization_users')
      .where('organization_id', organizationId)
      .where('user_id', userId)
      .first({ client: trx })) as { id: number } | null

    if (!membership) {
      throw new Error('Người tạo task phải thuộc tổ chức của task')
    }
  }

  /**
   * Validate project và task cùng organization
   * Logic từ before_task_project_insert trigger:
   *   IF (SELECT organization_id FROM projects WHERE id = NEW.project_id) != NEW.organization_id
   *   THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Project and task must belong to the same organization'
   */
  private async validateProjectOrganization(
    projectId: number,
    organizationId: number,
    trx: TransactionClientContract
  ): Promise<void> {
    const project = (await db
      .from('projects')
      .where('id', projectId)
      .whereNull('deleted_at')
      .first({ client: trx })) as { organization_id: number } | null

    if (!project) {
      throw new Error('Project không tồn tại')
    }

    if (project.organization_id !== organizationId) {
      throw new Error('Project and task must belong to the same organization')
    }
  }

  /**
   * Validate assignee là org member hoặc freelancer
   * Logic từ check_assigned_to_insert trigger:
   *   1. Check nếu là org member (status = 'approved')
   *   2. Nếu không, check nếu là freelancer (user_details.is_freelancer = TRUE)
   */
  private async validateAssignee(
    assigneeId: number,
    organizationId: number,
    trx: TransactionClientContract
  ): Promise<void> {
    // Check if assignee is approved org member
    const isMember = (await db
      .from('organization_users')
      .where('organization_id', organizationId)
      .where('user_id', assigneeId)
      .where('status', 'approved')
      .first({ client: trx })) as { id: number } | null

    if (isMember) return // OK - is org member

    // Check if assignee is freelancer
    const isFreelancer = (await db
      .from('user_details')
      .where('user_id', assigneeId)
      .where('is_freelancer', true)
      .first({ client: trx })) as { user_id: number } | null

    if (isFreelancer) return // OK - is freelancer

    throw new Error('Người được gán phải thuộc tổ chức hoặc là freelancer')
  }

  /**
   * Send notification cho người được giao task
   */
  private async sendAssignmentNotification(
    task: Task,
    creator: User,
    assigneeId: number
  ): Promise<void> {
    try {
      // Don't notify if assigning to self
      if (assigneeId === creator.id) {
        return
      }

      const assignee = await User.find(assigneeId)
      if (!assignee) {
        logger.warn(`[CreateTaskCommand] Assignee user not found: ${assigneeId}`)
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

  /**
   * Validate creator active
   * Logic từ procedure: Check user deleted_at IS NULL AND status = 'active'
   */
  private async validateCreatorActive(
    userId: number,
    trx: TransactionClientContract
  ): Promise<void> {
    const user = (await db
      .from('users')
      .join('user_status', 'users.status_id', 'user_status.id')
      .where('users.id', userId)
      .whereNull('users.deleted_at')
      .where('user_status.name', 'active')
      .first({ client: trx })) as { id: number } | null

    if (!user) {
      throw new Error('Creator không tồn tại hoặc không active')
    }
  }

  /**
   * Validate org exists
   * Logic từ procedure: Check org deleted_at IS NULL
   */
  private async validateOrgExists(orgId: number, trx: TransactionClientContract): Promise<void> {
    const org = (await db
      .from('organizations')
      .where('id', orgId)
      .whereNull('deleted_at')
      .first({ client: trx })) as { id: number } | null

    if (!org) {
      throw new Error('Organization không tồn tại')
    }
  }

  /**
   * Validate permission to create task
   * Logic từ procedure: is_org_admin_or_owner OR is_project_manager_or_owner
   */
  private async validateCreateTaskPermission(
    userId: number,
    orgId: number,
    projectId: number | null | undefined,
    trx: TransactionClientContract
  ): Promise<void> {
    // Check if org admin/owner
    const isOrgAdmin = (await db
      .from('organization_users')
      .join('organization_roles', 'organization_users.role_id', 'organization_roles.id')
      .where('organization_users.user_id', userId)
      .where('organization_users.organization_id', orgId)
      .where('organization_users.status', 'approved')
      .whereIn('organization_roles.name', ['org_owner', 'org_admin'])
      .first({ client: trx })) as { id: number } | null

    if (isOrgAdmin) return

    // Check if project manager/owner
    if (projectId) {
      const isProjectManager = (await db
        .from('project_members')
        .join('project_roles', 'project_members.project_role_id', 'project_roles.id')
        .where('project_members.user_id', userId)
        .where('project_members.project_id', projectId)
        .whereIn('project_roles.name', ['project_owner', 'project_manager'])
        .first({ client: trx })) as { id: number } | null

      if (isProjectManager) return
    }

    throw new Error(
      'Chỉ org_admin, org_owner hoặc project_manager mới có thể tạo task. org_member không có quyền này.'
    )
  }

  /**
   * Validate status exists
   */
  private async validateStatusExists(
    statusId: number,
    trx: TransactionClientContract
  ): Promise<void> {
    const status = (await db.from('task_status').where('id', statusId).first({ client: trx })) as {
      id: number
    } | null

    if (!status) {
      throw new Error('Status ID không hợp lệ')
    }
  }

  /**
   * Validate label exists
   */
  private async validateLabelExists(
    labelId: number,
    trx: TransactionClientContract
  ): Promise<void> {
    const label = (await db.from('task_labels').where('id', labelId).first({ client: trx })) as {
      id: number
    } | null

    if (!label) {
      throw new Error('Label ID không hợp lệ')
    }
  }

  /**
   * Validate priority exists
   */
  private async validatePriorityExists(
    priorityId: number,
    trx: TransactionClientContract
  ): Promise<void> {
    const priority = (await db
      .from('task_priorities')
      .where('id', priorityId)
      .first({ client: trx })) as { id: number } | null

    if (!priority) {
      throw new Error('Priority ID không hợp lệ')
    }
  }
}
