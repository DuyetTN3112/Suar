import { BaseCommand } from '../../shared/base_command.js'
import type { ChangeUserRoleDTO } from '../dtos/change_user_role_dto.js'
import User from '#models/user'
import { SystemRoleName } from '#constants'
import BusinessLogicException from '#exceptions/business_logic_exception'
import ForbiddenException from '#exceptions/forbidden_exception'
import emitter from '@adonisjs/core/services/emitter'

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
    // Verify changer has superadmin permission
    const isSuperadmin = await User.isSuperadmin(dto.changerId)
    if (!isSuperadmin) {
      throw new ForbiddenException('Chỉ superadmin mới có thể thay đổi vai trò người dùng')
    }

    // Prevent self-role-change
    if (dto.changerId === dto.targetUserId) {
      throw new BusinessLogicException('Không thể thay đổi vai trò của chính mình')
    }

    // Verify target user exists and not deleted
    const targetUser = await User.findNotDeletedOrFail(dto.targetUserId)

    // v3: Validate new role is a valid SystemRoleName
    const validRoles = Object.values(SystemRoleName) as string[]
    if (!validRoles.includes(String(dto.newRoleId))) {
      throw new BusinessLogicException(`Vai trò không hợp lệ: ${String(dto.newRoleId)}`)
    }

    // Get old role for audit log
    const oldRole = targetUser.system_role

    // v3: Update inline system_role string
    targetUser.system_role = String(dto.newRoleId)
    await targetUser.save()

    // Log the action
    await this.logAudit(
      'change_user_role',
      'user',
      dto.targetUserId,
      { system_role: oldRole },
      { system_role: dto.newRoleId }
    )

    // Emit audit event
    void emitter.emit('audit:log', {
      userId: dto.changerId,
      action: 'change_user_role',
      entityType: 'user',
      entityId: dto.targetUserId,
      oldValues: { system_role: oldRole },
      newValues: { system_role: dto.newRoleId },
    })

    // Invalidate permission cache
    void emitter.emit('cache:invalidate', {
      entityType: 'user',
      entityId: dto.targetUserId,
      patterns: [`*user:${String(dto.targetUserId)}:*`],
    })
  }
}
