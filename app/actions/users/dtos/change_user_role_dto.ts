import type { Command } from '../../shared/interfaces.js'
import type { DatabaseId } from '#types/database'
import ValidationException from '#exceptions/validation_exception'

/**
 * ChangeUserRoleDTO
 *
 * Data Transfer Object for changing a user's role in an organization.
 * Used by ChangeUserRoleCommand.
 */
export class ChangeUserRoleDTO implements Command {
  constructor(
    public readonly targetUserId: DatabaseId,
    public readonly newRoleId: DatabaseId,
    public readonly changerId: DatabaseId
  ) {
    this.validate()
  }

  private validate(): void {
    if (Number(this.targetUserId) < 1) {
      throw new ValidationException('Invalid target user ID')
    }

    if (Number(this.newRoleId) < 1) {
      throw new ValidationException('Invalid role ID')
    }

    if (Number(this.changerId) < 1) {
      throw new ValidationException('Invalid changer ID')
    }
  }
}
