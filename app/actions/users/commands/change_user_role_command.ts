import { BaseCommand } from '../../shared/base_command.js'
import type { ChangeUserRoleDTO } from '../dtos/index.js'
import db from '@adonisjs/lucid/services/db'

/**
 * ChangeUserRoleCommand
 *
 * Changes a user's role in an organization.
 * Uses stored procedure for permission checks.
 *
 * This is a Command (Write operation) that changes system state.
 *
 * Business Rules:
 * - Only superadmin can change roles
 * - Uses stored procedure: change_user_role_with_permission
 * - Audit log is created automatically by stored procedure
 */
export default class ChangeUserRoleCommand extends BaseCommand<ChangeUserRoleDTO, void> {
  /**
   * Main handler - changes user role using stored procedure
   */
  async handle(dto: ChangeUserRoleDTO): Promise<void> {
    // Use stored procedure with permission checks built-in
    await this.changeRoleViaStoredProcedure(dto)

    // Log the action
    await this.logAudit('change_user_role', 'user', dto.targetUserId, null, {
      new_role_id: dto.newRoleId,
    })
  }

  /**
   * Call stored procedure to change user role
   * Stored procedure handles all permission checks
   */
  private async changeRoleViaStoredProcedure(dto: ChangeUserRoleDTO): Promise<void> {
    try {
      await db.rawQuery('CALL change_user_role_with_permission(?, ?, ?)', [
        dto.changerId,
        dto.targetUserId,
        dto.newRoleId,
      ])
    } catch (error) {
      // Stored procedure throws error if no permission
      throw new Error(
        error instanceof Error
          ? error.message
          : 'Chỉ superadmin mới có thể thay đổi vai trò người dùng'
      )
    }
  }
}
