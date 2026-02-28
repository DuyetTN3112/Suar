import { BaseCommand } from '#actions/shared/base_command'
import type { AddProjectMemberDTO } from '../dtos/add_project_member_dto.js'
import Project from '#models/project'
import type { DatabaseId } from '#types/database'
import User from '#models/user'
import { ProjectRole as ProjectRoleEnum } from '#constants'
import OrganizationUser from '#models/organization_user'
import ProjectMember from '#models/project_member'
import PermissionService from '#services/permission_service'
import CacheService from '#services/cache_service'
import emitter from '@adonisjs/core/services/emitter'
import ForbiddenException from '#exceptions/forbidden_exception'
import BusinessLogicException from '#exceptions/business_logic_exception'
import ConflictException from '#exceptions/conflict_exception'

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
      const project = await Project.query({ client: trx })
        .where('id', dto.project_id)
        .whereNull('deleted_at')
        .firstOrFail()

      // 2. Check permissions (owner or superadmin)
      await this.validatePermission(userId, project)

      // 3. Load user to be added
      const userToAdd = await User.findOrFail(dto.user_id)

      // 4. v3: Validate project_role is a valid ProjectRole constant
      const validRoles = Object.values(ProjectRoleEnum) as string[]
      if (!validRoles.includes(String(dto.project_role))) {
        throw new BusinessLogicException(`Vai trò dự án không hợp lệ: ${String(dto.project_role)}`)
      }

      // 5. Check user is in same organization
      const isOrgMember = await OrganizationUser.isApprovedMember(
        project.organization_id,
        dto.user_id,
        trx
      )
      if (!isOrgMember) {
        throw new BusinessLogicException('Người dùng không thuộc tổ chức của dự án')
      }

      // 6. Check user is not already a member
      const existingMember = await ProjectMember.findMember(dto.project_id, dto.user_id, trx)
      if (existingMember) {
        throw ConflictException.alreadyExists('Người dùng đã là thành viên của dự án')
      }

      // 7. Add user as member
      await ProjectMember.addMember(dto.project_id, dto.user_id, String(dto.project_role), trx)

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

  /**
   * Validate requester has permission to add members.
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
      throw new ForbiddenException('Chỉ owner hoặc admin mới có thể thêm thành viên vào dự án')
    }
  }
}
