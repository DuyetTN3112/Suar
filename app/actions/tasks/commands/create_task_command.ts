import UserRepository from '#infra/users/repositories/user_repository'
import OrganizationRepository from '#infra/organizations/repositories/organization_repository'
import OrganizationUserRepository from '#infra/organizations/repositories/organization_user_repository'
import ProjectRepository from '#infra/projects/repositories/project_repository'
import TaskRepository from '#infra/tasks/repositories/task_repository'
import TaskRequiredSkillRepository from '#infra/tasks/repositories/task_required_skill_repository'
import TaskStatusRepository from '#infra/tasks/repositories/task_status_repository'
import SkillRepository from '#infra/skills/repositories/skill_repository'
import CreateAuditLog from '#actions/common/create_audit_log'
import type CreateTaskDTO from '../dtos/request/create_task_dto.js'
import {
  BACKEND_NOTIFICATION_ENTITY_TYPES,
  BACKEND_NOTIFICATION_TYPES,
} from '#constants/notification_constants'
import logger from '@adonisjs/core/services/logger'
import type { ExecutionContext } from '#types/execution_context'
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { DateTime } from 'luxon'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import BusinessLogicException from '#exceptions/business_logic_exception'
import { AuditAction, EntityType } from '#constants/audit_constants'
import CacheService from '#services/cache_service'
import emitter from '@adonisjs/core/services/emitter'
import type { DatabaseId } from '#types/database'
import type Task from '#models/task'
import { enforcePolicy } from '#actions/shared/enforce_policy'
import { canCreateTask } from '#domain/tasks/task_permission_policy'
import { validateTaskCreationFields } from '#domain/tasks/task_assignment_rules'
import { buildTaskCreatePermissionContext } from '#actions/tasks/support/task_permission_context_builder'
import CreateNotification from '#actions/common/create_notification'

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
    private createNotification: CreateNotification = new CreateNotification()
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
  async execute(dto: CreateTaskDTO): Promise<import('#models/task').default> {
    const userId = this.requireUserId()
    const newTask = await this.createTaskInTransaction(dto, userId)
    await this.runPostCommitEffects(newTask, dto, userId)
    return await TaskRepository.findByIdWithDetailRelations(newTask.id)
  }

  private requireUserId(): DatabaseId {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException()
    }

    return userId
  }

  private async ensureTaskCreationPreconditions(
    userId: DatabaseId,
    dto: CreateTaskDTO,
    trx: TransactionClientContract
  ): Promise<void> {
    await UserRepository.findActiveOrFail(userId, trx)
    await OrganizationRepository.findActiveOrFail(dto.organization_id, trx)
    await this.ensureCreatePermission(userId, dto, trx)
    await ProjectRepository.validateBelongsToOrg(dto.project_id, dto.organization_id, trx)
    await this.ensureParentTaskBoundary(dto, trx)
    this.ensureCreationFieldRules(dto)
    await this.ensureAssigneeBoundary(dto, trx)
  }

  private async ensureCreatePermission(
    userId: DatabaseId,
    dto: CreateTaskDTO,
    trx: TransactionClientContract
  ): Promise<void> {
    const permissionContext = await buildTaskCreatePermissionContext(
      userId,
      dto.organization_id,
      dto.project_id,
      trx
    )
    enforcePolicy(canCreateTask(permissionContext))
  }

  private async ensureParentTaskBoundary(
    dto: CreateTaskDTO,
    trx: TransactionClientContract
  ): Promise<void> {
    if (!dto.parent_task_id) {
      return
    }

    const parentTask = await TaskRepository.findActiveTaskIdentity(dto.parent_task_id, trx)

    if (!parentTask) {
      throw new BusinessLogicException('Task cha không tồn tại')
    }

    if (parentTask.organization_id !== dto.organization_id) {
      throw new BusinessLogicException('Task cha phải thuộc cùng tổ chức với task con')
    }
  }

  private ensureCreationFieldRules(dto: CreateTaskDTO): void {
    enforcePolicy(
      validateTaskCreationFields({
        status: null,
        label: dto.label ?? null,
        priority: dto.priority ?? null,
        isDueDateInPast: dto.due_date ? dto.due_date < DateTime.now() : false,
      })
    )
  }

  private async ensureAssigneeBoundary(
    dto: CreateTaskDTO,
    trx: TransactionClientContract
  ): Promise<void> {
    if (!dto.assigned_to) {
      return
    }

    const isMember = await OrganizationUserRepository.isApprovedMember(
      dto.assigned_to,
      dto.organization_id,
      trx
    )
    if (isMember) {
      return
    }

    const isFreelancer = await UserRepository.isFreelancer(dto.assigned_to, trx)
    if (!isFreelancer) {
      throw new BusinessLogicException('Người được gán phải thuộc tổ chức hoặc là freelancer')
    }
  }

  private async createTaskRecord(
    dto: CreateTaskDTO,
    userId: DatabaseId,
    trx: TransactionClientContract
  ): Promise<Task> {
    const selectedStatus = await this.resolveTaskStatus(dto, trx)
    const resolvedDueDate = dto.due_date ?? DateTime.now().plus({ days: 7 })

    return TaskRepository.create(
      {
        title: dto.title,
        description: dto.description || '',
        status: selectedStatus.category,
        task_status_id: selectedStatus.id,
        task_type: dto.task_type,
        acceptance_criteria: dto.acceptance_criteria,
        verification_method: dto.verification_method,
        expected_deliverables: dto.expected_deliverables,
        context_background: dto.context_background ?? null,
        impact_scope: dto.impact_scope ?? null,
        tech_stack: dto.tech_stack,
        environment: dto.environment ?? null,
        collaboration_type: dto.collaboration_type ?? null,
        complexity_notes: dto.complexity_notes ?? null,
        measurable_outcomes: dto.measurable_outcomes,
        learning_objectives: dto.learning_objectives,
        domain_tags: dto.domain_tags,
        role_in_task: dto.role_in_task ?? null,
        autonomy_level: dto.autonomy_level ?? null,
        problem_category: dto.problem_category ?? null,
        business_domain: dto.business_domain ?? null,
        estimated_users_affected: dto.estimated_users_affected ?? null,
        label: dto.label || undefined,
        priority: dto.priority || undefined,
        assigned_to: dto.assigned_to ?? null,
        due_date: resolvedDueDate,
        parent_task_id: dto.parent_task_id ?? null,
        estimated_time: dto.estimated_time,
        actual_time: dto.actual_time,
        project_id: dto.project_id,
        // Source of truth ownership lives on project.organization_id.
        // organization_id stays as a denormalized cache after the project/org validation above.
        organization_id: dto.organization_id,
        creator_id: userId,
      },
      trx
    )
  }

  private async createTaskInTransaction(dto: CreateTaskDTO, userId: DatabaseId): Promise<Task> {
    const trx = await db.transaction()

    try {
      await this.ensureTaskCreationPreconditions(userId, dto, trx)
      const newTask = await this.createTaskRecord(dto, userId, trx)
      await this.persistRequiredSkills(newTask.id, dto.required_skills, trx)
      await this.recordTaskCreatedAudit(newTask, userId)
      await trx.commit()
      return newTask
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }

  private async resolveTaskStatus(
    dto: CreateTaskDTO,
    trx: TransactionClientContract
  ): Promise<NonNullable<Awaited<ReturnType<typeof TaskStatusRepository.findByIdAndOrgActive>>>> {
    const selectedStatus = await TaskStatusRepository.findByIdAndOrgActive(
      dto.task_status_id,
      dto.organization_id,
      trx
    )

    if (!selectedStatus) {
      throw new BusinessLogicException('Task status không tồn tại trong tổ chức hiện tại')
    }

    return selectedStatus
  }

  private async persistRequiredSkills(
    taskId: DatabaseId,
    requiredSkills: CreateTaskDTO['required_skills'],
    trx: TransactionClientContract
  ): Promise<void> {
    if (requiredSkills.length === 0) {
      throw new BusinessLogicException('Task phải có ít nhất 1 kỹ năng yêu cầu')
    }

    const skillIds = requiredSkills.map((skill) => skill.id)
    const activeSkills = await SkillRepository.findActiveByIds(skillIds, trx)
    const activeSkillIds = new Set(activeSkills.map((skill) => skill.id))
    const invalidSkill = requiredSkills.find((skill) => !activeSkillIds.has(skill.id))

    if (invalidSkill) {
      throw new BusinessLogicException('Có kỹ năng yêu cầu không tồn tại hoặc đã bị vô hiệu hóa')
    }

    await TaskRequiredSkillRepository.createMany(
      requiredSkills.map((skill) => ({
        task_id: taskId,
        skill_id: skill.id,
        required_level_code: skill.level,
        is_mandatory: true,
      })),
      trx
    )
  }

  private async recordTaskCreatedAudit(task: Task, userId: DatabaseId): Promise<void> {
    await new CreateAuditLog(this.execCtx).handle({
      user_id: userId,
      action: AuditAction.CREATE,
      entity_type: EntityType.TASK,
      entity_id: task.id,
      new_values: task.toJSON(),
    })
  }

  private async runPostCommitEffects(
    task: Task,
    dto: CreateTaskDTO,
    userId: DatabaseId
  ): Promise<void> {
    void emitter.emit('task:created', {
      task,
      creatorId: userId,
      organizationId: dto.organization_id,
      projectId: dto.project_id,
    })

    await this.invalidateTaskCaches()

    if (dto.isAssigned() && dto.assigned_to !== undefined) {
      await this.sendAssignmentNotification(task, userId, dto.assigned_to)
    }
  }

  private async invalidateTaskCaches(): Promise<void> {
    await CacheService.deleteByPattern('organization:tasks:*')
    await CacheService.deleteByPattern('tasks:public:*')
    await CacheService.deleteByPattern('task:user:*')
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

      const [assignee, creator] = await Promise.all([
        UserRepository.findById(assigneeId),
        UserRepository.findById(creatorId),
      ])
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
        message: `${creator.username || creator.email || 'Người dùng'} đã giao cho bạn nhiệm vụ mới: ${task.title}`,
        type: BACKEND_NOTIFICATION_TYPES.TASK_ASSIGNED,
        related_entity_type: BACKEND_NOTIFICATION_ENTITY_TYPES.TASK,
        related_entity_id: task.id,
      })

      logger.info(`[CreateTaskCommand] Notification sent to user ${assigneeId} for task ${task.id}`)
    } catch (error) {
      // Don't fail task creation if notification fails
      logger.error('[CreateTaskCommand] Failed to send assignment notification', { error })
    }
  }
}
