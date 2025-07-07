import emitter from '@adonisjs/core/services/emitter'

import { ProjectRole } from '#constants'

import type { CreateProjectDTO } from '../dtos/request/create_project_dto.js'

import { BaseCommand } from '#actions/shared/base_command'
import { enforcePolicy } from '#actions/shared/enforce_policy'
import { validateProjectStatus, validateProjectDates } from '#domain/projects/project_state_rules'
import ForbiddenException from '#exceptions/forbidden_exception'
import CacheService from '#infra/cache/cache_service'
import loggerService from '#infra/logger/logger_service'
import OrganizationUserRepository from '#infra/organizations/repositories/organization_user_repository'
import ProjectMemberRepository from '#infra/projects/repositories/project_member_repository'
import ProjectRepository from '#infra/projects/repositories/project_repository'
import PermissionService from '#services/permission_service'
import type { DatabaseId } from '#types/database'



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
 * @extends {BaseCommand<CreateProjectDTO, import('#models/project').default>}
 */
export default class CreateProjectCommand extends BaseCommand<
  CreateProjectDTO,
  import('#models/project').default
> {
  async handle(dto: CreateProjectDTO): Promise<import('#models/project').default> {
    const userId = this.getCurrentUserId()

    const createdProject = await this.executeInTransaction(async (trx) => {
      // 1. Check permission can_create_project (logic từ procedure)
      const hasPermission = await PermissionService.checkOrgPermission(
        userId,
        dto.organization_id,
        'can_create_project',
        trx
      )

      if (!hasPermission) {
        throw new ForbiddenException('Chỉ org_admin và org_owner mới có thể tạo project')
      }

      const isSuperadmin = await PermissionService.isSystemSuperadmin(userId, trx)

      // 2. v3: Validate status via pure rule
      if (dto.status) {
        enforcePolicy(validateProjectStatus(dto.status))
      }

      // 3. Validate dates via pure rule
      if (dto.start_date && dto.end_date) {
        enforcePolicy(
          validateProjectDates({
            startDate: dto.start_date.toISO() ?? null,
            endDate: dto.end_date.toISO() ?? null,
          })
        )
      }

      // 4. Organization members must be approved unless the actor is a superadmin bypass.
      if (!isSuperadmin) {
        await OrganizationUserRepository.findApprovedMemberOrFail(dto.organization_id, userId, trx)
      }

      // 5. Set owner_id and manager_id
      const ownerId = userId
      const managerId = dto.manager_id ?? ownerId

      // 6. Create the project
      const project = await ProjectRepository.create(
        {
          name: dto.name,
          description: dto.description ?? null,
          organization_id: dto.organization_id,
          creator_id: userId,
          owner_id: ownerId,
          manager_id: managerId,
          status: dto.status,
          visibility: dto.visibility,
          start_date: dto.start_date ?? null,
          end_date: dto.end_date ?? null,
          budget: dto.budget,
        },
        trx
      )

      // 7. Add owner as project member (from trigger)
      await ProjectMemberRepository.addMember(project.id, ownerId, ProjectRole.OWNER, trx)

      // 8. Log audit trail
      await this.logAudit('create', 'project', project.id, null, project.toJSON())

      return project
    })

    const result = await this.loadProjectWithRelations(createdProject.id)

    // 9. Send notification (từ procedure - outside transaction)
    this.sendProjectCreatedNotification(result, userId)

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
  private sendProjectCreatedNotification(
    project: import('#models/project').default,
    userId: DatabaseId
  ): void {
    loggerService.info(
      `[CreateProjectCommand] Notification: Project "${project.name}" created for user ${userId}`
    )
  }

  /**
   * Load project with all necessary relations
   */
  private async loadProjectWithRelations(
    projectId: DatabaseId
  ): Promise<import('#models/project').default> {
    return ProjectRepository.findDetailWithRelations(projectId)
  }
}
