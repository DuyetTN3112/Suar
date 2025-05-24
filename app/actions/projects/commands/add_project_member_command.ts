import { HttpContext } from '@adonisjs/core/http'
import { BaseCommand } from '#actions/shared/base_command'
import { AddProjectMemberDTO } from '../dtos/index.js'
import Project from '#models/project'
import User from '#models/user'
import db from '@adonisjs/lucid/services/db'

/**
 * Command to add a member to a project
 *
 * Business Rules:
 * - Only owner or superadmin can add members
 * - User must be in the same organization
 * - User cannot already be a member
 * - Sends notification to the added user
 *
 * @extends {BaseCommand<AddProjectMemberDTO, void>}
 */
export default class AddProjectMemberCommand extends BaseCommand<AddProjectMemberDTO, void> {
  constructor(ctx: HttpContext) {
    super(ctx)
  }

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

      // 4. Check user is in same organization
      await this.validateSameOrganization(dto.user_id, project.organization_id, trx)

      // 5. Check user is not already a member
      await this.checkNotAlreadyMember(dto.project_id, dto.user_id, trx)

      // 6. Add user as member
      await this.addMember(dto.project_id, dto.user_id, dto.role, trx)

      // 7. Send notification to added user
      // await this.sendNotification(userToAdd, project) // TODO: Implement notification

      // 8. Log audit trail
      await this.logAudit('add_member', 'project', project.id, null, {
        user_id: dto.user_id,
        username: userToAdd.username,
        role: dto.role,
      })
    })
  }

  /**
   * Validate requester has permission to add members
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
      throw new Error('Chỉ owner hoặc superadmin mới có thể thêm thành viên vào dự án')
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
   * Validate user is in the same organization as the project
   */
  private async validateSameOrganization(
    userId: number,
    organizationId: number,
    trx: any
  ): Promise<void> {
    const result = await trx
      .from('organization_users')
      .where('user_id', userId)
      .where('organization_id', organizationId)
      .where('status', 'approved')
      .first()

    if (!result) {
      throw new Error('Người dùng không thuộc tổ chức của dự án')
    }
  }

  /**
   * Check user is not already a member
   */
  private async checkNotAlreadyMember(projectId: number, userId: number, trx: any): Promise<void> {
    const existing = await trx
      .from('project_members')
      .where('project_id', projectId)
      .where('user_id', userId)
      .first()

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
    role: string,
    trx: any
  ): Promise<void> {
    await trx.table('project_members').insert({
      project_id: projectId,
      user_id: userId,
      role: role,
      created_at: new Date(),
    })
  }
}
