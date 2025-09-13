import type { Command } from '../../interfaces.js'

import ValidationException from '#modules/http/exceptions/validation_exception'
import { SystemRoleName } from '#modules/users/public_contracts/user_constants'

/**
 * ChangeUserRoleDTO
 *
 * Data Transfer Object for changing a user's system role.
 * v3: system_role is inline VARCHAR on users table.
 * newRoleId is a SystemRoleName string (e.g. 'superadmin', 'system_admin', 'registered_user').
 */
export class ChangeUserRoleDTO implements Command {
  constructor(
    public readonly targetUserId: string,
    public readonly newRoleId: string,
    public readonly changerId: string
  ) {
    this.validate()
  }

  private validate(): void {
    if (!this.targetUserId) {
      throw new ValidationException('Invalid target user ID')
    }

    if (!this.newRoleId) {
      throw new ValidationException('Invalid role')
    }

    const validRoles = Object.values(SystemRoleName) as string[]
    if (!validRoles.includes(this.newRoleId)) {
      throw new ValidationException(`Role must be one of: ${validRoles.join(', ')}`)
    }

    if (!this.changerId) {
      throw new ValidationException('Invalid changer ID')
    }
  }
}
