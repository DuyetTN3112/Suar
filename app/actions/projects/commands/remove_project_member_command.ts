import { BaseCommand } from '#actions/shared/base_command'
import type { RemoveProjectMemberDTO } from '../dtos/remove_project_member_dto.js'
import Project from '#models/project'
import Task from '#models/task'
import type { DatabaseId } from '#types/database'
import User from '#models/user'
import ProjectMember from '#models/project_member'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import PermissionService from '#services/permission_service'
import CacheService from '#services/cache_service'
import emitter from '@adonisjs/core/services/emitter'
import ForbiddenException from '#exceptions/forbidden_exception'
import BusinessLogicException from '#exceptions/business_logic_exception'

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
      const project = await Project.query({ client: trx })
        .where('id', dto.project_id)
        .whereNull('deleted_at')
        .firstOrFail()

      // 2. Check permissions
      await this.validatePermission(userId, project)

      // 3. Load user to be removed
      const userToRemove = await User.findOrFail(dto.user_id)

      // 4. Check not removing owner
      this.validateNotOwner(project, dto.user_id)

      // 5. Get member role before removal
      const memberRole = await ProjectMember.getRoleName(dto.project_id, dto.user_id, trx)

      // 6. Reassign tasks if needed
      const reassignToUserId = dto.reassign_to ?? project.manager_id ?? project.owner_id
      if (reassignToUserId === null) {
        throw new BusinessLogicException(
          'Không thể phân công lại công việc - không có người dùng hợp lệ'
        )
      }
      await this.reassignTasks(dto.project_id, dto.user_id, reassignToUserId, trx)

      // 7. Remove member
      await ProjectMember.deleteMember(dto.project_id, dto.user_id, trx)

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
   * Validate requester has permission to remove members.
   * Allowed: project owner, project creator, org admin/owner, system superadmin.
   */
  private async validatePermission(userId: DatabaseId, project: Project): Promise<void> {
    const canManage = await PermissionService.canManageProject(
      userId,
      project.owner_id,
      project.creator_id,
      project.organization_id
    )

    if (!canManage) {
      throw new ForbiddenException('Chỉ owner hoặc admin mới có thể xóa thành viên khỏi dự án')
    }
  }

  /**
   * Validate not removing the owner
   */
  private validateNotOwner(project: Project, userIdToRemove: DatabaseId): void {
    if (project.owner_id === userIdToRemove) {
      throw new BusinessLogicException('Không thể xóa owner khỏi dự án')
    }

    if (project.creator_id === userIdToRemove) {
      throw new BusinessLogicException('Không thể xóa người tạo dự án')
    }
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
    await Task.reassignByUser(projectId, fromUserId, toUserId, trx)
  }
}
