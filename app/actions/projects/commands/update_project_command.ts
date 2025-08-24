import emitter from '@adonisjs/core/services/emitter'

import type { UpdateProjectDTO } from '../dtos/request/update_project_dto.js'
import { DefaultProjectDependencies } from '../ports/project_external_dependencies_impl.js'

import { auditPublicApi } from '#actions/audit/public_api'
import { enforcePolicy } from '#actions/authorization/public_api'
import { BaseCommand } from '#actions/projects/base_command'
import { canUpdateProjectFields } from '#domain/projects/project_permission_policy'
import BusinessLogicException from '#exceptions/business_logic_exception'
import CacheService from '#infra/cache/cache_service'
import * as projectMemberQueries from '#infra/projects/repositories/read/project_member_queries'
import * as projectMutations from '#infra/projects/repositories/write/project_mutations'
import type { DatabaseId } from '#types/database'
import type { ProjectRecord } from '#types/project_records'

/**
 * Command to update an existing project
 *
 * Business Rules:
 * - Owner can update all fields
 * - Superadmin can update all fields
 * - Manager can update: description, start_date, end_date, status
 * - Logs all field changes to audit trail
 *
 * @extends {BaseCommand<UpdateProjectDTO, ProjectRecord>}
 */
export default class UpdateProjectCommand extends BaseCommand<
  UpdateProjectDTO,
  ProjectRecord
> {
  /**
   * Execute the command
   *
   * @param dto - Validated UpdateProjectDTO
   * @returns Updated project
   */
  async handle(dto: UpdateProjectDTO): Promise<ProjectRecord> {
    const userId = this.getCurrentUserId()

    // Check if there are any updates
    if (!dto.hasUpdates()) {
      throw new BusinessLogicException('Không có thay đổi nào để cập nhật')
    }

    const result = await this.executeInTransaction(async (trx) => {
      // 1. Load project with lock (prevents concurrent updates)
      const project = await projectMutations.findActiveForUpdateRecord(dto.project_id, trx)

      // 2. Check permissions via pure rule
      const actor = await DefaultProjectDependencies.user.findActorInfo(userId, trx)
      const actorOrgRole = await DefaultProjectDependencies.organization.getMembershipRole(
        project.organization_id,
        userId,
        trx
      )
      const projectMember = await projectMemberQueries.findMember(dto.project_id, userId, trx)
      const actorProjectRole = projectMember?.project_role ?? null

      const fieldResult = canUpdateProjectFields(
        {
          actorId: userId,
          actorSystemRole: actor.system_role,
          actorOrgRole,
          actorProjectRole,
          projectCreatorId: project.creator_id,
          projectOwnerId: project.owner_id ?? '',
          projectOrganizationId: project.organization_id,
        },
        dto.getUpdatedFields()
      )
      enforcePolicy(fieldResult)

      // 3. Store old values for audit
      const oldValues = this.getTrackedFields(project)

      // 4. Update project fields
      const updateData = dto.toObject()
      const updatedProject = await projectMutations.updateByIdRecord(project.id, updateData, trx)

      // 5. Get new values
      const newValues = this.getTrackedFields(updatedProject)

      // 6. Log audit trail for each changed field
      await this.logFieldChanges(project.id, oldValues, newValues, dto.getUpdatedFields())

      return {
        project: updatedProject,
        projectUpdatedEvent: {
          projectId: project.id,
          updatedBy: userId,
          changes: updateData,
        },
      }
    })

    // Side-effects are post-commit to avoid firing on rollback.
    void emitter.emit('project:updated', result.projectUpdatedEvent)
    void CacheService.deleteByPattern(`organization:tasks:*`)

    return result.project
  }

  /**
   * Get tracked field values for audit
   */
  private getTrackedFields(project: ProjectRecord): Record<string, unknown> {
    return {
      name: project.name,
      description: project.description,
      status: project.status,
      start_date: project.start_date,
      end_date: project.end_date,
      manager_id: project.manager_id,
      owner_id: project.owner_id,
      visibility: project.visibility,
      budget: project.budget,
    }
  }

  /**
   * Log changes for each updated field
   */
  private async logFieldChanges(
    projectId: DatabaseId,
    oldValues: Record<string, unknown>,
    newValues: Record<string, unknown>,
    updatedFields: string[]
  ): Promise<void> {
    for (const field of updatedFields) {
      if (oldValues[field] !== newValues[field]) {
        if (this.execCtx.userId) {
          await auditPublicApi.write(this.execCtx, {
            user_id: this.execCtx.userId,
            action: 'update',
            entity_type: 'project',
            entity_id: projectId,
            old_values: { [field]: oldValues[field] },
            new_values: {
              [field]: newValues[field],
            },
          })
        }
      }
    }
  }
}
