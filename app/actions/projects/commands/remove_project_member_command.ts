import { BaseCommand } from '#actions/shared/base_command'
import type { RemoveProjectMemberDTO } from '../dtos/index.js'
import Project from '#models/project'
import User from '#models/user'
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

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
    const user = this.getCurrentUser()

    await this.executeInTransaction(async (trx) => {
      // 1. Load project
      const project = await Project.query({ client: trx })
        .where('id', dto.project_id)
        .whereNull('deleted_at')
        .firstOrFail()

      // 2. Check permissions
      await this.validatePermission(user.id, project)

      // 3. Load user to be removed
      const userToRemove = await User.findOrFail(dto.user_id)

      // 4. Check not removing owner
      this.validateNotOwner(project, dto.user_id)

      // 5. Get member role before removal
      const memberRole = await this.getMemberRole(dto.project_id, dto.user_id, trx)

      // 6. Reassign tasks if needed
      const reassignToUserId = dto.reassign_to ?? project.manager_id ?? project.owner_id
      await this.reassignTasks(dto.project_id, dto.user_id, reassignToUserId, trx)

      // 7. Remove member
      await this.removeMember(dto.project_id, dto.user_id, trx)

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
    const result = await db
      .from('organization_users')
      .where('user_id', userId)
      .where('organization_id', organizationId)
      .where('role_id', 1)
      .where('status', 'approved')
      .first()

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
    const member = await db
      .from('project_members')
      .join('project_roles', 'project_members.project_role_id', 'project_roles.id')
      .where('project_members.project_id', projectId)
      .where('project_members.user_id', userId)
      .select('project_roles.name as role')
      .useTransaction(trx)
      .first()

    return (member as { role?: string } | null)?.role ?? 'unknown'
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
    await db
      .from('tasks')
      .where('project_id', projectId)
      .where('assigned_to', fromUserId)
      .whereNull('deleted_at')
      .update({
        assigned_to: toUserId,
        updated_at: new Date(),
      })
      .useTransaction(trx)
  }

  /**
   * Remove member from project
   */
  private async removeMember(
    projectId: number,
    userId: number,
    trx: TransactionClientContract
  ): Promise<void> {
    await db
      .from('project_members')
      .where('project_id', projectId)
      .where('user_id', userId)
      .delete()
      .useTransaction(trx)
  }
}
