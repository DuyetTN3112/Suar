import type { Command } from '../../shared/interfaces.js'

/**
 * ChangeUserRoleDTO
 *
 * Data Transfer Object for changing a user's role in an organization.
 * Used by ChangeUserRoleCommand.
 */
export class ChangeUserRoleDTO implements Command {
  constructor(
    public readonly targetUserId: number,
    public readonly newRoleId: number,
    public readonly changerId: number
  ) {
    this.validate()
  }

  private validate(): void {
    if (this.targetUserId < 1) {
      throw new Error('Invalid target user ID')
    }

    if (this.newRoleId < 1) {
      throw new Error('Invalid role ID')
    }

    if (this.changerId < 1) {
      throw new Error('Invalid changer ID')
    }
  }
}
