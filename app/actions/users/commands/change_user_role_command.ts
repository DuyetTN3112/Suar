import emitter from '@adonisjs/core/services/emitter'

import { BaseCommand } from '../base_command.js'
import type { ChangeUserRoleDTO } from '../dtos/request/change_user_role_dto.js'

import { auditPublicApi } from '#actions/audit/public_api'
import { enforcePolicy } from '#actions/authorization/public_api'
import { canChangeUserRole } from '#domain/users/user_management_rules'
import * as userModelQueries from '#infra/users/repositories/read/model_queries'
import * as userMutations from '#infra/users/repositories/write/user_mutations'

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
    const isSuperadmin = await userModelQueries.isSuperadmin(dto.changerId)
    enforcePolicy(
      canChangeUserRole({
        actorId: dto.changerId,
        targetUserId: dto.targetUserId,
        isActorSuperadmin: isSuperadmin,
        newRole: dto.newRoleId,
      })
    )

    // Verify target user exists and not deleted
    const targetUser = await userModelQueries.findNotDeletedOrFailRecord(dto.targetUserId)

    // Get old role for audit log
    const oldRole = targetUser.system_role

    // v3: Update inline system_role string
    await userMutations.updateSystemRoleRecord(dto.targetUserId, dto.newRoleId)

    // Log the action
    if (this.execCtx.userId) {
      await auditPublicApi.write(this.execCtx, {
        user_id: this.execCtx.userId,
        action: 'change_user_role',
        entity_type: 'user',
        entity_id: dto.targetUserId,
        old_values: { system_role: oldRole },
        new_values: { system_role: dto.newRoleId },
      })
    }

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
