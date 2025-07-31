import emitter from '@adonisjs/core/services/emitter'

import type { CreateProjectDTO } from '../dtos/request/create_project_dto.js'
import { DefaultProjectDependencies } from '../ports/project_external_dependencies_impl.js'

import { auditPublicApi } from '#actions/audit/public_api'
import { enforcePolicy } from '#actions/authorization/public_api'
import { BaseCommand } from '#actions/projects/base_command'
import { ProjectRole } from '#constants/project_constants'
import { canCreateProject } from '#domain/projects/project_permission_policy'
import { validateProjectStatus, validateProjectDates } from '#domain/projects/project_state_rules'
import CacheService from '#infra/cache/cache_service'
import loggerService from '#infra/logger/logger_service'
import * as projectModelQueries from '#infra/projects/repositories/read/project_model_queries'
import * as projectMemberMutations from '#infra/projects/repositories/write/project_member_mutations'
import * as projectMutations from '#infra/projects/repositories/write/project_mutations'
import type { DatabaseId } from '#types/database'
import type { ProjectDetailRecord } from '#types/project_records'

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
 * @extends {BaseCommand<CreateProjectDTO, ProjectDetailRecord>}
 */
export default class CreateProjectCommand extends BaseCommand<
  CreateProjectDTO,
  ProjectDetailRecord
> {
  async handle(dto: CreateProjectDTO): Promise<ProjectDetailRecord> {
    const userId = this.getCurrentUserId()

    const createdProject = await this.executeInTransaction(async (trx) => {
      // 1. Check permission can_create_project (logic từ procedure)
      const hasPermission = await DefaultProjectDependencies.permission.checkOrgPermission(
        userId,
        dto.organization_id,
        'can_create_project',
        trx
      )

      enforcePolicy(
        canCreateProject({
          actorSystemRole: null,
          isOrgAdminOrOwner: hasPermission,
        })
      )

      const isSuperadmin = await DefaultProjectDependencies.permission.isSystemSuperadmin(
        userId,
        trx
      )

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
        await DefaultProjectDependencies.organization.ensureApprovedMember(
          dto.organization_id,
          userId,
          trx
        )
      }

      // 5. Set owner_id and manager_id
      const ownerId = userId
      const managerId = dto.manager_id ?? ownerId

      // 6. Create the project
      const project = await projectMutations.createRecord(
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
      await projectMemberMutations.addMember(project.id, ownerId, ProjectRole.OWNER, trx)

      // 8. Log audit trail
      if (this.execCtx.userId) {
        await auditPublicApi.write(this.execCtx, {
          user_id: this.execCtx.userId,
          action: 'create',
          entity_type: 'project',
          entity_id: project.id,
          old_values: null,
          new_values: project,
        })
      }

      return project
    })

    const result = await this.loadProjectWithRelations(createdProject.id)

    // 9. Send notification (từ procedure - outside transaction)
    this.sendProjectCreatedNotification(result, userId)

    // Invalidate project list caches
    await CacheService.deleteByPattern(`organization:tasks:*`)

    // Emit domain event (replaces after_project_insert trigger side-effects)
    void emitter.emit('project:created', {
      projectId: result.id,
      creatorId: userId,
      organizationId: result.organization_id,
      name: result.name,
    })

    return result
  }

  /**
   * Send project created notification
   * Logic từ procedure: CALL create_notification(...)
   */
  private sendProjectCreatedNotification(
    project: { name: string },
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
  ): Promise<ProjectDetailRecord> {
    return projectModelQueries.findDetailWithRelationsRecord(projectId)
  }
}
