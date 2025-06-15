import { BaseCommand } from '#actions/shared/base_command'
import type { ExecutionContext } from '#types/execution_context'
import User from '#models/user'
import { Exception } from '@adonisjs/core/exceptions'

/**
 * UpdateUserSystemRoleCommand (System Admin)
 *
 * Updates the system role of a user.
 * Only accessible by superadmin.
 *
 * Business Rules:
 * - Cannot downgrade yourself
 * - Cannot promote user to superadmin unless you are superadmin
 * - User must exist
 */

export interface UpdateUserSystemRoleDTO {
  userId: string
  systemRole: 'superadmin' | 'system_admin' | 'registered_user'
}

export default class UpdateUserSystemRoleCommand extends BaseCommand<
  UpdateUserSystemRoleDTO,
  void
> {
  constructor(execCtx: ExecutionContext) {
    super(execCtx)
  }

  async handle(dto: UpdateUserSystemRoleDTO): Promise<void> {
    // Fetch target user
    const user = await User.find(dto.userId)
    if (!user) {
      throw new Exception('User not found', { status: 404 })
    }

    // Fetch current admin (executor)
    const currentUserId = this.getCurrentUserId()
    const currentUser = await User.find(currentUserId)
    if (!currentUser) {
      throw new Exception('Current user not found', { status: 401 })
    }

    // Rule: Cannot change yourself
    if (currentUserId === dto.userId) {
      throw new Exception('Cannot change your own role', { status: 403 })
    }

    // Rule: Only superadmin can promote to superadmin
    if (dto.systemRole === 'superadmin' && currentUser.system_role !== 'superadmin') {
      throw new Exception('Only superadmin can create other superadmins', { status: 403 })
    }

    // Update role
    user.system_role = dto.systemRole
    await user.save()
  }
}
