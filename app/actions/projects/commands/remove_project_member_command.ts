import emitter from '@adonisjs/core/services/emitter'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import type { RemoveProjectMemberDTO } from '../dtos/request/remove_project_member_dto.js'
import { DefaultProjectDependencies } from '../ports/project_external_dependencies_impl.js'

import { auditPublicApi } from '#actions/audit/public_api'
import { enforcePolicy } from '#actions/authorization/public_api'
import { BaseCommand } from '#actions/projects/base_command'
import { canRemoveProjectMember } from '#domain/projects/project_permission_policy'
import BusinessLogicException from '#exceptions/business_logic_exception'
import CacheService from '#infra/cache/cache_service'
import * as projectMemberQueries from '#infra/projects/repositories/read/project_member_queries'
import * as projectModelQueries from '#infra/projects/repositories/read/project_model_queries'
import * as projectMemberMutations from '#infra/projects/repositories/write/project_member_mutations'
import type { DatabaseId } from '#types/database'

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
      const project = await projectModelQueries.findActiveOrFail(dto.project_id, trx)

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
      const memberRole = await projectMemberQueries.getRoleName(dto.project_id, dto.user_id, trx)

      // 6. Reassign tasks if needed
      const reassignToUserId = dto.reassign_to ?? project.manager_id ?? project.owner_id
      if (reassignToUserId === null) {
        throw new BusinessLogicException(
          'Không thể phân công lại công việc - không có người dùng hợp lệ'
        )
      }
      await this.reassignTasks(dto.project_id, dto.user_id, reassignToUserId, trx)

      // 7. Remove member
      await projectMemberMutations.deleteMember(dto.project_id, dto.user_id, trx)

      // 8. Log audit trail
      if (this.execCtx.userId) {
        await auditPublicApi.write(this.execCtx, {
          user_id: this.execCtx.userId,
          action: 'remove_member',
          entity_type: 'project',
          entity_id: project.id,
          old_values: {
            user_id: dto.user_id,
            username: userToRemove.username,
            role: memberRole,
          },
          new_values: {
            reason: dto.reason,
            reassigned_to: reassignToUserId,
          },
        })
      }
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
