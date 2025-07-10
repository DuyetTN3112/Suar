import { BaseCommand } from '../../shared/base_command.js'
import type { ChangeUserRoleDTO } from '../dtos/request/change_user_role_dto.js'
import UserRepository from '#infra/users/repositories/user_repository'
import emitter from '@adonisjs/core/services/emitter'
import { enforcePolicy } from '#actions/shared/enforce_policy'
import { canChangeUserRole } from '#domain/users/user_management_rules'

/**
 * ChangeUserRoleCommand (v3)
 *
 * Changes a user's system role.
 * v3: system_role is inline VARCHAR on users table.
 * newRoleId in DTO is now a role name string (e.g. 'superadmin', 'system_admin').
 *
 * Business Rules:
 * - Only superadmin can change roles
 * - Cannot change own role
 * - Target user must exist and not be deleted
 */
export default class ChangeUserRoleCommand extends BaseCommand<ChangeUserRoleDTO> {
  async handle(dto: ChangeUserRoleDTO): Promise<void> {

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
