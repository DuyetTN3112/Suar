import { BaseCommand } from '#actions/shared/base_command'
import type { ExecutionContext } from '#types/execution_context'
import AdminUserRepository from '#infra/admin/repositories/admin_user_repository'
import { Exception } from '@adonisjs/core/exceptions'

/**
 * UpdateUserSystemRoleCommand (System Admin)
 *
 * Updates the system role of a user.
 * Uses repository (Infrastructure layer) for DB operations.
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

export default class UpdateUserSystemRoleCommand extends BaseCommand<UpdateUserSystemRoleDTO> {
  constructor(
    execCtx: ExecutionContext,
    private userRepo = new AdminUserRepository()
  ) {
    super(execCtx)
  }

  async handle(dto: UpdateUserSystemRoleDTO): Promise<void> {
    // Fetch target user from repository
    const user = await this.userRepo.findById(dto.userId)
    if (!user) {
      throw new Exception('User not found', { status: 404 })
    }

    // Fetch current admin (executor) from repository
    const currentUserId = this.getCurrentUserId()
    const currentUser = await this.userRepo.findById(currentUserId)
    if (!currentUser) {
      throw new Exception('Current user not found', { status: 401 })
    }

    // Business Rule: Cannot change yourself
    if (currentUserId === dto.userId) {
      throw new Exception('Cannot change your own role', { status: 403 })
    }

    // Business Rule: Only superadmin can promote to superadmin
    if (dto.systemRole === 'superadmin' && currentUser.system_role !== 'superadmin') {
      throw new Exception('Only superadmin can create other superadmins', { status: 403 })
    }

    // Delegate to repository for persistence
    await this.userRepo.updateSystemRole(dto.userId, dto.systemRole)
  }
}
