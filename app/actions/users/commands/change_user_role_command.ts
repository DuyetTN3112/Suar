import { BaseCommand } from '../../shared/base_command.js'
import type { ChangeUserRoleDTO } from '../dtos/change_user_role_dto.js'
import db from '@adonisjs/lucid/services/db'

/**
 * ChangeUserRoleCommand
 *
 * Changes a user's system role.
 * Implements permission check in application code.
 *
 * This is a Command (Write operation) that changes system state.
 *
 * Business Rules:
 * - Only superadmin can change roles
 * - Cannot change own role
 * - Target user must exist and not be deleted
 */
export default class ChangeUserRoleCommand extends BaseCommand<ChangeUserRoleDTO> {
  /**
   * Main handler - changes user role with permission checks
   */
  async handle(dto: ChangeUserRoleDTO): Promise<void> {
    // Verify changer has superadmin permission
    await this.verifyChangerPermission(dto.changerId)

    // Prevent self-role-change
    if (dto.changerId === dto.targetUserId) {
      throw new Error('Không thể thay đổi vai trò của chính mình')
    }

    // Verify target user exists
    const targetUser = await db
      .from('users')
      .where('id', dto.targetUserId)
      .whereNull('deleted_at')
      .first()

    if (!targetUser) {
      throw new Error('Người dùng không tồn tại hoặc đã bị xóa')
    }

    // Verify new role exists
    const role = await db.from('system_roles').where('id', dto.newRoleId).first()
    if (!role) {
      throw new Error('Vai trò không hợp lệ')
    }

    // Get old role for audit log
    const oldRoleId = targetUser.system_role_id

    // Update user's system role
    await db.from('users').where('id', dto.targetUserId).update({
      system_role_id: dto.newRoleId,
    })

    // Log the action
    await this.logAudit(
      'change_user_role',
      'user',
      dto.targetUserId,
      { role_id: oldRoleId },
      {
        role_id: dto.newRoleId,
      }
    )
  }

  /**
   * Verify the changer is a superadmin
   */
  private async verifyChangerPermission(changerId: number): Promise<void> {
    const changer = await db
      .from('users')
      .join('system_roles', 'users.system_role_id', 'system_roles.id')
      .where('users.id', changerId)
      .select('system_roles.name as role_name')
      .first()

    if (!changer || changer.role_name?.toLowerCase() !== 'superadmin') {
      throw new Error('Chỉ superadmin mới có thể thay đổi vai trò người dùng')
    }
  }
}
