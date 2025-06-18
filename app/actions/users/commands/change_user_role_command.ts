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
    // Verify permissions via pure rule
    const isSuperadmin = await UserRepository.isSuperadmin(dto.changerId)
    enforcePolicy(
      canChangeUserRole({
        actorId: dto.changerId,
        targetUserId: dto.targetUserId,
        isActorSuperadmin: isSuperadmin,
        newRole: dto.newRoleId,
      })
    )

    // Verify target user exists and not deleted
    const targetUser = await UserRepository.findNotDeletedOrFail(dto.targetUserId)

    // Get old role for audit log
    const oldRole = targetUser.system_role

    // v3: Update inline system_role string
    targetUser.system_role = dto.newRoleId
    await UserRepository.save(targetUser)

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
      patterns: [`*user:${dto.targetUserId}:*`],
    })
  }
}
