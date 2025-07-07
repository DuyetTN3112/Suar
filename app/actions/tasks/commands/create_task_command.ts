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
import type CreateNotification from '#actions/common/create_notification'
import logger from '@adonisjs/core/services/logger'
import type { ExecutionContext } from '#types/execution_context'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import BusinessLogicException from '#exceptions/business_logic_exception'
import { AuditAction, EntityType } from '#constants/audit_constants'
import CacheService from '#services/cache_service'
import emitter from '@adonisjs/core/services/emitter'
import type { DatabaseId } from '#types/database'
import { enforcePolicy } from '#actions/shared/enforce_policy'
import { canCreateTask } from '#domain/tasks/task_permission_policy'
import { validateTaskCreationFields } from '#domain/tasks/task_assignment_rules'
import { buildTaskCreatePermissionContext } from '#actions/tasks/support/task_permission_context_builder'

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
  async execute(dto: CreateTaskDTO): Promise<import('#models/task').default> {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException()
    }
    const trx = await db.transaction()

    try {
      // 1. Validate actor state through repositories
      await UserRepository.findActiveOrFail(userId, trx)

      // 2. Validate organization context through repositories
      await OrganizationRepository.findActiveOrFail(dto.organization_id, trx)

      // 3. Check permission through domain policy
      const createPermissionContext = await buildTaskCreatePermissionContext(
        userId,
        dto.organization_id,
        dto.project_id,
        trx
      )
      enforcePolicy(canCreateTask(createPermissionContext))

      // 4. Validate project ownership boundary through repositories
      await ProjectRepository.validateBelongsToOrg(dto.project_id, dto.organization_id, trx)

      if (dto.parent_task_id) {
        const parentTask = await TaskRepository.findActiveTaskIdentity(dto.parent_task_id, trx)

        if (!parentTask) {
          throw new BusinessLogicException('Task cha không tồn tại')
        }

        if (parentTask.organization_id !== dto.organization_id) {
          throw new BusinessLogicException('Task cha phải thuộc cùng tổ chức với task con')
        }
      }

      // 5. Validate creation fields via pure rule
      enforcePolicy(
        validateTaskCreationFields({
          status: null,
          label: dto.label ?? null,
          priority: dto.priority ?? null,
          isDueDateInPast: dto.due_date ? dto.due_date < DateTime.now() : false,
        })
      )

      // 9. Validate assignee boundary through repositories
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

      const selectedStatus = await TaskStatusRepository.findByIdAndOrgActive(
        dto.task_status_id,
        dto.organization_id,
        trx
      )

      if (!selectedStatus) {
        throw new BusinessLogicException('Task status không tồn tại trong tổ chức hiện tại')
      }

      const resolvedDueDate = dto.due_date ?? DateTime.now().plus({ days: 7 })

      // 10. Create task
      const newTask = await TaskRepository.create(
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

      // 10b. Persist required skills (single source of truth: task_required_skills)
      if (dto.required_skills.length === 0) {
        throw new BusinessLogicException('Task phải có ít nhất 1 kỹ năng yêu cầu')
      }

      const skillIds = dto.required_skills.map((skill) => skill.id)
      const activeSkills = await SkillRepository.findActiveByIds(skillIds, trx)
      const activeSkillIds = new Set(activeSkills.map((skill) => skill.id))

      const invalidSkill = dto.required_skills.find((skill) => !activeSkillIds.has(skill.id))
      if (invalidSkill) {
        throw new BusinessLogicException('Có kỹ năng yêu cầu không tồn tại hoặc đã bị vô hiệu hóa')
      }

      await TaskRequiredSkillRepository.createMany(
        dto.required_skills.map((skill) => ({
          task_id: newTask.id,
          skill_id: skill.id,
          required_level_code: skill.level,
          is_mandatory: true,
        })),
        trx
      )

      // 5. Create audit log
      await new CreateAuditLog(this.execCtx).handle({
        user_id: userId,
        action: AuditAction.CREATE,
        entity_type: EntityType.TASK,
        entity_id: newTask.id,
        new_values: newTask.toJSON(),
      })

      await trx.commit()

      // Emit domain event
      void emitter.emit('task:created', {
        task: newTask,
        creatorId: userId,
        organizationId: dto.organization_id,
        projectId: dto.project_id,
      })

      // Invalidate task list and organization task caches
      await CacheService.deleteByPattern(`organization:tasks:*`)
      await CacheService.deleteByPattern(`tasks:public:*`)
      await CacheService.deleteByPattern(`task:user:*`)

      // 6. Send notification if task is assigned (outside transaction)
      if (dto.isAssigned() && dto.assigned_to !== undefined) {
        await this.sendAssignmentNotification(newTask, userId, dto.assigned_to)
      }

      return await TaskRepository.findByIdWithDetailRelations(newTask.id)
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }

  /**
   * Send notification cho người được giao task
   */
  private async sendAssignmentNotification(
    task: import('#models/task').default,
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
