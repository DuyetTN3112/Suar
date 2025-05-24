import type { Command } from '../../shared/interfaces.js'

/**
 * UpdateUserProfileDTO
 *
 * Data Transfer Object for updating user profile information.
 * Used by UpdateUserProfileCommand.
 */
export class UpdateUserProfileDTO implements Command {
  constructor(
    public readonly userId: number,
    public readonly firstName?: string,
    public readonly lastName?: string,
    public readonly phoneNumber?: string,
    public readonly bio?: string,
    public readonly dateOfBirth?: string,
    public readonly language?: string
  ) {
    this.validate()
  }

  private validate(): void {
    if (this.userId < 1) {
      throw new Error('Invalid user ID')
    }

    if (this.firstName !== undefined && this.firstName.trim().length === 0) {
      throw new Error('First name cannot be empty')
    }

    if (this.lastName !== undefined && this.lastName.trim().length === 0) {
      throw new Error('Last name cannot be empty')
    }
  }
}
