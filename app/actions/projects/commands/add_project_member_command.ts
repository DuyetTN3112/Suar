import { BaseCommand } from '#actions/shared/base_command'
import type { AddProjectMemberDTO } from '../dtos/request/add_project_member_dto.js'
import OrganizationUserRepository from '#infra/organizations/repositories/organization_user_repository'
import ProjectMemberRepository from '#infra/projects/repositories/project_member_repository'
import ProjectRepository from '#infra/projects/repositories/project_repository'
import UserRepository from '#infra/users/repositories/user_repository'
import CacheService from '#infra/cache/cache_service'
import emitter from '@adonisjs/core/services/emitter'
import { enforcePolicy } from '#actions/shared/enforce_policy'
import { canAddProjectMember } from '#domain/projects/project_permission_policy'

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
      const project = await ProjectRepository.findActiveOrFail(dto.project_id, trx)

      // 2-6. Validate via pure rule
      const actor = await UserRepository.findNotDeletedOrFail(userId, trx)
      const actorOrgMembership = await OrganizationUserRepository.findMembership(
        project.organization_id,
        userId,
        trx
      )
      const isTargetOrgMember = await OrganizationUserRepository.isApprovedMember(
        project.organization_id,
        dto.user_id,
        trx
      )
      const existingMember = await ProjectMemberRepository.findMember(
        dto.project_id,
        dto.user_id,
        trx
      )

      enforcePolicy(
        canAddProjectMember({
          actorId: userId,
          actorSystemRole: actor.system_role,
          actorOrgRole: actorOrgMembership?.org_role ?? null,
          projectOwnerId: project.owner_id ?? '',
          projectCreatorId: project.creator_id,
          targetRole: dto.project_role,
          isTargetOrgMember,
          isAlreadyMember: !!existingMember,
        })
      )

      // Load user to be added (for audit log)
      const userToAdd = await UserRepository.findNotDeletedOrFail(dto.user_id, trx)

      // 7. Add user as member
      await ProjectMemberRepository.addMember(dto.project_id, dto.user_id, dto.project_role, trx)

      // 8. Log audit trail
      await this.logAudit('add_member', 'project', project.id, null, {
        user_id: dto.user_id,
        username: userToAdd.username,
        project_role: dto.project_role,
      })
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
