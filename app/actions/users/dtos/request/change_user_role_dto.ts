import type { Command } from '../../../shared/interfaces.js'
import type { DatabaseId } from '#types/database'
import { SystemRoleName } from '#constants'
import ValidationException from '#exceptions/validation_exception'

/**
 * ChangeUserRoleDTO
 *
 * Data Transfer Object for changing a user's system role.
 * v3: system_role is inline VARCHAR on users table.
 * newRoleId is a SystemRoleName string (e.g. 'superadmin', 'system_admin', 'registered_user').
 */
export class ChangeUserRoleDTO implements Command {
  constructor(
    public readonly targetUserId: DatabaseId,
    public readonly newRoleId: string,
    public readonly changerId: DatabaseId
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
