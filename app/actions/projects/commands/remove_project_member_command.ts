import { BaseCommand } from '#actions/shared/base_command'
import type { RemoveProjectMemberDTO } from '../dtos/request/remove_project_member_dto.js'
import TaskRepository from '#infra/tasks/repositories/task_repository'
import type { DatabaseId } from '#types/database'
import ProjectMemberRepository from '#infra/projects/repositories/project_member_repository'
import ProjectRepository from '#infra/projects/repositories/project_repository'
import UserRepository from '#infra/users/repositories/user_repository'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import CacheService from '#services/cache_service'
import emitter from '@adonisjs/core/services/emitter'
import BusinessLogicException from '#exceptions/business_logic_exception'
import OrganizationUserRepository from '#infra/organizations/repositories/organization_user_repository'
import { enforcePolicy } from '#actions/shared/enforce_policy'
import { canRemoveProjectMember } from '#domain/projects/project_permission_policy'

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
      const actor = await UserRepository.findNotDeletedOrFail(userId, trx)
      const orgMembership = await OrganizationUserRepository.findMembership(
        project.organization_id,
        userId,
        trx
      )

      enforcePolicy(
        canRemoveProjectMember({
          actorId: userId,
          actorSystemRole: actor.system_role,
          actorOrgRole: orgMembership?.org_role ?? null,
          projectOwnerId: project.owner_id ?? '',
          projectCreatorId: project.creator_id,
          targetUserId: dto.user_id,
        })
      )

      // 3. Load user to be removed (for audit log)
      const userToRemove = await UserRepository.findNotDeletedOrFail(dto.user_id, trx)

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
   * Validate requester has permission to remove members
   */
  private async validatePermission(userId: number, project: Project): Promise<void> {
    const isOwner = project.owner_id === userId
    const isCreator = project.creator_id === userId

    if (isOwner || isCreator) {
      return
    }

    // Check if user is superadmin
    const isSuperAdmin = await this.checkIsSuperAdmin(userId, project.organization_id)

    if (!isSuperAdmin) {
      throw new Error('Chỉ owner hoặc superadmin mới có thể xóa thành viên khỏi dự án')
    }
  }

  /**
   * Check if user is superadmin of the organization
   */
  private async checkIsSuperAdmin(userId: number, organizationId: number): Promise<boolean> {
    const result = (await db
      .from('organization_users')
      .where('user_id', userId)
      .where('organization_id', organizationId)
      .where('role_id', 1)
      .where('status', 'approved')
      .first()) as { id: number } | null

    return !!result
  }

  /**
   * Validate not removing the owner
   */
  private validateNotOwner(project: Project, userIdToRemove: number): void {
    if (project.owner_id === userIdToRemove) {
      throw new Error('Không thể xóa owner khỏi dự án')
    }

    if (project.creator_id === userIdToRemove) {
      throw new Error('Không thể xóa người tạo dự án')
    }
  }

  /**
   * Get member role
   */
  private async getMemberRole(
    projectId: number,
    userId: number,
    trx: TransactionClientContract
  ): Promise<string> {
    const member = (await trx
      .from('project_members')
      .join('project_roles', 'project_members.project_role_id', 'project_roles.id')
      .where('project_members.project_id', projectId)
      .where('project_members.user_id', userId)
      .select('project_roles.name as role')
      .first()) as { role?: string } | null

    return member?.role ?? 'unknown'
  }

  /**
   * Reassign all tasks from removed member
   */
  private async reassignTasks(
    projectId: number,
    fromUserId: number,
    toUserId: number,
    trx: TransactionClientContract
  ): Promise<void> {
    await trx
      .from('tasks')
      .where('project_id', projectId)
      .where('assigned_to', fromUserId)
      .whereNull('deleted_at')
      .update({
        assigned_to: toUserId,
        updated_at: new Date(),
      })
  }

  /**
   * Remove member from project
   */
  private async removeMember(
    projectId: number,
    userId: number,
    trx: TransactionClientContract
  ): Promise<void> {
    await trx
      .from('project_members')
      .where('project_id', projectId)
      .where('user_id', userId)
      .delete()
  }
}
