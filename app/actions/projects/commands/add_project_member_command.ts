import { BaseCommand } from '#actions/shared/base_command'
import type { AddProjectMemberDTO } from '../dtos/add_project_member_dto.js'
import Project from '#models/project'
import User from '#models/user'
import ProjectRole from '#models/project_role'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { OrganizationUserStatus } from '#constants/organization_constants'
import PermissionService from '#services/permission_service'
import CacheService from '#services/cache_service'

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
    const user = this.getCurrentUser()

    await this.executeInTransaction(async (trx) => {
      // 1. Load project
      const project = await Project.query({ client: trx })
        .where('id', dto.project_id)
        .whereNull('deleted_at')
        .firstOrFail()

      // 2. Check permissions (owner or superadmin)
      await this.validatePermission(user.id, project)

      // 3. Load user to be added
      const userToAdd = await User.findOrFail(dto.user_id)

      // 4. Validate project_role_id exists (FK validation)
      const role = await this.validateProjectRoleId(dto.project_role_id, trx)

      // 5. Check user is in same organization
      await this.validateSameOrganization(dto.user_id, project.organization_id, trx)

      // 6. Check user is not already a member
      await this.checkNotAlreadyMember(dto.project_id, dto.user_id, trx)

      // 7. Add user as member
      await this.addMember(dto.project_id, dto.user_id, dto.project_role_id, trx)

      // 8. Log audit trail
      await this.logAudit('add_member', 'project', project.id, null, {
        user_id: dto.user_id,
        username: userToAdd.username,
        project_role_id: dto.project_role_id,
        role_name: role.name,
      })
    })

    // Invalidate project member caches
    await CacheService.deleteByPattern(`organization:tasks:*`)
  }

  /**
   * Validate requester has permission to add members.
   * Allowed: project owner, project creator, org admin/owner, system superadmin.
   */
  private async validatePermission(userId: number, project: Project): Promise<void> {
    const canManage = await PermissionService.canManageProject(
      userId,
      project.owner_id,
      project.creator_id,
      project.organization_id
    )

    if (!canManage) {
      throw new Error('Chỉ owner hoặc admin mới có thể thêm thành viên vào dự án')
    }
  }

  /**
   * Validate project_role_id exists in project_roles
   * (FK validation - project_members.project_role_id -> project_roles.id)
   */
  private async validateProjectRoleId(
    roleId: number,
    trx: TransactionClientContract
  ): Promise<ProjectRole> {
    const role = await ProjectRole.query({ client: trx }).where('id', roleId).first()

    if (!role) {
      throw new Error(`Project role với ID ${roleId} không tồn tại`)
    }

    return role
  }

  /**
   * Validate user is in the same organization as the project
   */
  private async validateSameOrganization(
    userId: number,
    organizationId: number,
    trx: TransactionClientContract
  ): Promise<void> {
    const result = (await trx
      .from('organization_users')
      .where('user_id', userId)
      .where('organization_id', organizationId)
      .where('status', OrganizationUserStatus.APPROVED)
      .first()) as { id: number } | null

    if (!result) {
      throw new Error('Người dùng không thuộc tổ chức của dự án')
    }
  }

  /**
   * Check user is not already a member
   */
  private async checkNotAlreadyMember(
    projectId: number,
    userId: number,
    trx: TransactionClientContract
  ): Promise<void> {
    const existing = (await trx
      .from('project_members')
      .where('project_id', projectId)
      .where('user_id', userId)
      .first()) as { id: number } | null

    if (existing) {
      throw new Error('Người dùng đã là thành viên của dự án')
    }
  }

  /**
   * Add user as project member
   */
  private async addMember(
    projectId: number,
    userId: number,
    projectRoleId: number,
    trx: TransactionClientContract
  ): Promise<void> {
    await trx.insertQuery().table('project_members').insert({
      project_id: projectId,
      user_id: userId,
      project_role_id: projectRoleId,
      created_at: new Date(),
    })
  }
}
