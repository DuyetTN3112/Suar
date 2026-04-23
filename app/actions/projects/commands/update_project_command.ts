import emitter from '@adonisjs/core/services/emitter'

import type { UpdateProjectDTO } from '../dtos/request/update_project_dto.js'

import { enforcePolicy } from '#actions/authorization/enforce_policy'
import { BaseCommand } from '#actions/shared/base_command'
import { canUpdateProjectFields } from '#domain/projects/project_permission_policy'
import BusinessLogicException from '#exceptions/business_logic_exception'
import CacheService from '#infra/cache/cache_service'
import ProjectMemberRepository from '#infra/projects/repositories/project_member_repository'
import ProjectRepository from '#infra/projects/repositories/project_repository'
import type { DatabaseId } from '#types/database'

import { DefaultProjectDependencies } from '../ports/project_external_dependencies_impl.js'

/**
 * Command to update an existing project
 *
 * Business Rules:
 * - Owner can update all fields
 * - Superadmin can update all fields
 * - Manager can update: description, start_date, end_date, status
 * - Logs all field changes to audit trail
 *
 * @extends {BaseCommand<UpdateProjectDTO, import('#models/project').default>}
 */
export default class UpdateProjectCommand extends BaseCommand<
  UpdateProjectDTO,
  import('#models/project').default
> {
  /**
   * Execute the command
   *
   * @param dto - Validated UpdateProjectDTO
   * @returns Updated project
   */
  async handle(dto: UpdateProjectDTO): Promise<import('#models/project').default> {
    const userId = this.getCurrentUserId()

    // Check if there are any updates
    if (!dto.hasUpdates()) {
      throw new BusinessLogicException('Không có thay đổi nào để cập nhật')
    }

    const result = await this.executeInTransaction(async (trx) => {
      // 1. Load project with lock (prevents concurrent updates)
      const project = await ProjectRepository.findActiveForUpdate(dto.project_id, trx)

      // 2. Check permissions via pure rule
      const actor = await DefaultProjectDependencies.user.findActorInfo(userId, trx)
      const actorOrgRole = await DefaultProjectDependencies.organization.getMembershipRole(
        project.organization_id,
        userId,
        trx
      )
      const projectMember = await ProjectMemberRepository.findMember(dto.project_id, userId, trx)
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
      project.merge(updateData)
      await ProjectRepository.save(project, trx)

      // 5. Get new values
      const newValues = this.getTrackedFields(project)

      // 6. Log audit trail for each changed field
      await this.logFieldChanges(project.id, oldValues, newValues, dto.getUpdatedFields())

      return {
        project,
        projectUpdatedEvent: {
          project,
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
  private getTrackedFields(project: import('#models/project').default): Record<string, unknown> {
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
        await this.logAudit(
          'update',
          'project',
          projectId,
          { [field]: oldValues[field] },
          {
            [field]: newValues[field],
          }
        )
      }
    }
  }
}
