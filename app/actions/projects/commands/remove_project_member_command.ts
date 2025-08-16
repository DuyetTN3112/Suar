import emitter from '@adonisjs/core/services/emitter'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import type { RemoveProjectMemberDTO } from '../dtos/request/remove_project_member_dto.js'

import { enforcePolicy } from '#actions/authorization/enforce_policy'
import { BaseCommand } from '#actions/shared/base_command'
import { canRemoveProjectMember } from '#domain/projects/project_permission_policy'
import BusinessLogicException from '#exceptions/business_logic_exception'
import CacheService from '#infra/cache/cache_service'
import ProjectMemberRepository from '#infra/projects/repositories/project_member_repository'
import ProjectRepository from '#infra/projects/repositories/project_repository'
import type { DatabaseId } from '#types/database'

import { DefaultProjectDependencies } from '../ports/project_external_dependencies_impl.js'

/**
 * Command to remove a member from a project
 *
 * Business Rules:
 * - Only owner or superadmin can remove members
 * - Cannot remove the owner
 * - Cannot remove the last superadmin
 * - Tasks assigned to removed member are reassigned to manager or specified user
 *
 * @extends {BaseCommand<RemoveProjectMemberDTO, void>}
 */
export default class RemoveProjectMemberCommand extends BaseCommand<RemoveProjectMemberDTO> {
  /**
   * Execute the command
   *
   * @param dto - Validated RemoveProjectMemberDTO
   */
  async handle(dto: RemoveProjectMemberDTO): Promise<void> {
    const userId = this.getCurrentUserId()

    await this.executeInTransaction(async (trx) => {
      // 1. Load project
      const project = await ProjectRepository.findActiveOrFail(dto.project_id, trx)

      // 2. Check permissions via pure rule
      const actor = await DefaultProjectDependencies.user.findActorInfo(userId, trx)
      const actorOrgRole = await DefaultProjectDependencies.organization.getMembershipRole(
        project.organization_id,
        userId,
        trx
      )

      enforcePolicy(
        canRemoveProjectMember({
          actorId: userId,
          actorSystemRole: actor.system_role,
          actorOrgRole,
          projectOwnerId: project.owner_id ?? '',
          projectCreatorId: project.creator_id,
          targetUserId: dto.user_id,
        })
      )

      // 3. Load user to be removed (for audit log)
      const userToRemove = await DefaultProjectDependencies.user.findActorInfo(dto.user_id, trx)

      // 5. Get member role before removal
      const memberRole = await ProjectMemberRepository.getRoleName(dto.project_id, dto.user_id, trx)

      // 6. Reassign tasks if needed
      const reassignToUserId = dto.reassign_to ?? project.manager_id ?? project.owner_id
      if (reassignToUserId === null) {
        throw new BusinessLogicException(
          'Không thể phân công lại công việc - không có người dùng hợp lệ'
        )
      }
      await this.reassignTasks(dto.project_id, dto.user_id, reassignToUserId, trx)

      // 7. Remove member
      await ProjectMemberRepository.deleteMember(dto.project_id, dto.user_id, trx)

      // 8. Log audit trail
      await this.logAudit(
        'remove_member',
        'project',
        project.id,
        {
          user_id: dto.user_id,
          username: userToRemove.username,
          role: memberRole,
        },
        {
          reason: dto.reason,
          reassigned_to: reassignToUserId,
        }
      )
    })

    // Emit domain event
    void emitter.emit('project:member:removed', {
      projectId: dto.project_id,
      userId: dto.user_id,
      removedBy: userId,
    })

    // Invalidate project member caches
    await CacheService.deleteByPattern(`organization:tasks:*`)
    await CacheService.deleteByPattern(`task:user:*`)
  }

  /**
   * Reassign all tasks from removed member → delegate to Model
   */
  private async reassignTasks(
    projectId: DatabaseId,
    fromUserId: DatabaseId,
    toUserId: DatabaseId,
    trx: TransactionClientContract
  ): Promise<void> {
    await DefaultProjectDependencies.task.reassignByUser(projectId, fromUserId, toUserId, trx)
  }
}
