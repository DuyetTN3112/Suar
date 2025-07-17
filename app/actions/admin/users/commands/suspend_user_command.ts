import { Exception } from '@adonisjs/core/exceptions'

import { BaseCommand } from '#actions/admin/base_command'
import { AdminUserReadOps } from '#infra/admin/repositories/read/admin_user_queries'
import { AdminUserWriteOps } from '#infra/admin/repositories/write/admin_user_mutations'
import type { ExecutionContext } from '#types/execution_context'

/**
 * SuspendUserCommand (System Admin)
 *
 * Suspends or activates a user account.
 * Uses repository (Infrastructure layer) for DB operations.
 *
 * Business Rules:
 * - Cannot suspend yourself
 * - Cannot suspend superadmin (unless you are superadmin)
 * - User must exist
 */

export interface SuspendUserDTO {
  userId: string
  action: 'suspend' | 'activate'
}

export default class SuspendUserCommand extends BaseCommand<SuspendUserDTO> {
  constructor(
    execCtx: ExecutionContext,
    private userReadRepo = AdminUserReadOps,
    private userWriteRepo = AdminUserWriteOps
  ) {
    super(execCtx)
  }

  async handle(dto: SuspendUserDTO): Promise<void> {
    // Fetch target user from repository
    const user = await this.userReadRepo.findById(dto.userId)
    if (!user) {
      throw new Exception('User not found', { status: 404 })
    }

    // Fetch current admin (executor) from repository
    const currentUserId = this.getCurrentUserId()
    const currentUser = await this.userReadRepo.findById(currentUserId)
    if (!currentUser) {
      throw new Exception('Current user not found', { status: 401 })
    }

    // Business Rule: Cannot suspend yourself
    if (currentUserId === dto.userId) {
      throw new Exception('Cannot suspend/activate your own account', { status: 403 })
    }

    // Business Rule: Only superadmin can suspend another superadmin
    if (user.system_role === 'superadmin' && currentUser.system_role !== 'superadmin') {
      throw new Exception('Only superadmin can suspend other superadmins', { status: 403 })
    }

    // Delegate to repository for persistence
    if (dto.action === 'suspend') {
      await this.userWriteRepo.suspendUser(dto.userId)
    } else {
      await this.userWriteRepo.activateUser(dto.userId)
    }
  }
}
