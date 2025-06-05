import { BaseCommand } from '#actions/shared/base_command'
import type { CreateProjectDTO } from '../dtos/request/create_project_dto.js'
import Project from '#models/project'
import { ProjectStatus, ProjectRole } from '#constants'
import ProjectMemberRepository from '#repositories/project_member_repository'
import OrganizationUserRepository from '#repositories/organization_user_repository'
import type { DatabaseId } from '#types/database'
import CacheService from '#services/cache_service'
import loggerService from '#services/logger_service'
import emitter from '@adonisjs/core/services/emitter'
import ForbiddenException from '#exceptions/forbidden_exception'
import { enforcePolicy } from '#domain/shared/enforce_policy'
import { validateProjectStatus, validateProjectDates } from '#domain/projects/project_state_rules'

/**
 * Command to create a new project
 *
 * Di chuyển logic từ database triggers:
 * - before_insert_project: Check permission can_create_project, set owner_id, manager_id
 * - after_project_insert: Add owner to project_members với project_role_id = 1
 *
 * Business Rules:
 * - Check permission can_create_project (từ trigger before_insert_project)
 * - Owner mặc định là creator
 * - Manager mặc định là owner
 * - Creator tự động thành project_members với role owner (project_role_id = 1)
 *
 * @extends {BaseCommand<CreateProjectDTO, Project>}
 */
export default class CreateProjectCommand extends BaseCommand<CreateProjectDTO, Project> {
  async handle(dto: CreateProjectDTO): Promise<Project> {
    const userId = this.getCurrentUserId()

    const result = await this.executeInTransaction(async (trx) => {
      // 1. Check permission can_create_project (logic từ procedure)
      const hasPermission = await this.checkOrgPermission(
        userId,
        dto.organization_id,
        'can_create_project',
        trx
      )

      if (!hasPermission) {
        throw new ForbiddenException('Chỉ org_admin và org_owner mới có thể tạo project')
      }

      // 2. v3: Validate status via pure rule
      if (dto.status) {
        enforcePolicy(validateProjectStatus(String(dto.status)))
      }

      // 3. Validate dates via pure rule
      if (dto.start_date && dto.end_date) {
        enforcePolicy(
          validateProjectDates({
            startDate: dto.start_date?.toISO() ?? null,
            endDate: dto.end_date?.toISO() ?? null,
          })
        )
      }

      // 4. Validate user is org member
      await OrganizationUserRepository.findApprovedMemberOrFail(dto.organization_id, userId, trx)

      // 5. Set owner_id and manager_id
      const ownerId = userId
      const managerId = dto.manager_id || ownerId

      // 6. Create the project
      const project = await Project.create(
        {
          name: dto.name,
          description: dto.description ?? null,
          organization_id: String(dto.organization_id),
          creator_id: userId,
          owner_id: ownerId,
          manager_id: managerId ? String(managerId) : null,
          status: dto.status || ProjectStatus.PENDING,
          visibility: dto.visibility,
          start_date: dto.start_date ?? null,
          end_date: dto.end_date ?? null,
          budget: dto.budget,
        },
        { client: trx }
      )

      // 7. Add owner as project member (from trigger)
      await ProjectMemberRepository.addMember(project.id, ownerId, ProjectRole.OWNER, trx)

      // 8. Log audit trail
      await this.logAudit('create', 'project', project.id, null, project.toJSON())

      // 9. Send notification (từ procedure - outside transaction)
      this.sendProjectCreatedNotification(project, userId)

      // 10. Load and return project with relations
      return await this.loadProjectWithRelations(project.id, trx)
    })

    // Invalidate project list caches
    await CacheService.deleteByPattern(`organization:tasks:*`)

    // Emit domain event (replaces after_project_insert trigger side-effects)
    void emitter.emit('project:created', {
      project: result,
      creatorId: userId,
      organizationId: result.organization_id,
    })

    return result
  }

  /**
   * Send project created notification
   * Logic từ procedure: CALL create_notification(...)
   */
  private sendProjectCreatedNotification(project: Project, userId: DatabaseId): void {
    loggerService.info(
      `[CreateProjectCommand] Notification: Project "${project.name}" created for user ${String(userId)}`
    )
  }

  /**
   * Load project with all necessary relations
   */
  private async loadProjectWithRelations(
    projectId: DatabaseId,
    trx: import('@adonisjs/lucid/types/database').TransactionClientContract
  ): Promise<Project> {
    return Project.query({ client: trx })
      .where('id', projectId)
      .preload('creator')
      .preload('manager')
      .preload('organization')
      .firstOrFail()
  }
}
