import emitter from '@adonisjs/core/services/emitter'

import type { AddProjectMemberDTO } from '../dtos/request/add_project_member_dto.js'
import { DefaultProjectDependencies } from '../ports/project_external_dependencies_impl.js'

import { auditPublicApi } from '#actions/audit/public_api'
import { enforcePolicy } from '#actions/authorization/public_api'
import { BaseCommand } from '#actions/projects/base_command'
import CacheService from '#infra/cache/cache_service'
import * as projectMemberQueries from '#infra/projects/repositories/read/project_member_queries'
import * as projectModelQueries from '#infra/projects/repositories/read/project_model_queries'
import * as projectMemberMutations from '#infra/projects/repositories/write/project_member_mutations'
import { canAddProjectMember } from '#modules/projects/domain/project_permission_policy'

/**
 * Command to add a member to a project
 *
 * Business Rules:
 * - Only owner or superadmin can add members
 * - User must be in the same organization
 * - User cannot already be a member
 * - Validates project_role_id exists (FK validation)
 * - Sends notification to the added user
 *
 * @extends {BaseCommand<AddProjectMemberDTO, void>}
 */
export default class AddProjectMemberCommand extends BaseCommand<AddProjectMemberDTO> {
  /**
   * Execute the command
   *
   * @param dto - Validated AddProjectMemberDTO
   */
  async handle(dto: AddProjectMemberDTO): Promise<void> {
    const userId = this.getCurrentUserId()

    await this.executeInTransaction(async (trx) => {
      // 1. Load project
      const project = await projectModelQueries.findActiveOrFail(dto.project_id, trx)

      // 2-6. Validate via pure rule
      const actor = await DefaultProjectDependencies.user.findActorInfo(userId, trx)
      const actorOrgRole = await DefaultProjectDependencies.organization.getMembershipRole(
        project.organization_id,
        userId,
        trx
      )
      const isTargetOrgMember = await DefaultProjectDependencies.organization.isApprovedMember(
        project.organization_id,
        dto.user_id,
        trx
      )
      const existingMember = await projectMemberQueries.findMember(
        dto.project_id,
        dto.user_id,
        trx
      )

      enforcePolicy(
        canAddProjectMember({
          actorId: userId,
          actorSystemRole: actor.system_role,
          actorOrgRole,
          projectOwnerId: project.owner_id ?? '',
          projectCreatorId: project.creator_id,
          targetRole: dto.project_role,
          isTargetOrgMember,
          isAlreadyMember: !!existingMember,
        })
      )

      // Load user to be added (for audit log)
      const userToAdd = await DefaultProjectDependencies.user.findActorInfo(dto.user_id, trx)

      // 7. Add user as member
      await projectMemberMutations.addMember(dto.project_id, dto.user_id, dto.project_role, trx)

      // 8. Log audit trail
      if (this.execCtx.userId) {
        await auditPublicApi.write(this.execCtx, {
          user_id: this.execCtx.userId,
          action: 'add_member',
          entity_type: 'project',
          entity_id: project.id,
          old_values: null,
          new_values: {
            user_id: dto.user_id,
            username: userToAdd.username,
            project_role: dto.project_role,
          },
        })
      }
    })

    // Emit domain event
    void emitter.emit('project:member:added', {
      projectId: dto.project_id,
      userId: dto.user_id,
      project_role: dto.project_role,
      addedBy: userId,
    })

    // Invalidate project member caches
    await CacheService.deleteByPattern(`organization:tasks:*`)
  }
}
