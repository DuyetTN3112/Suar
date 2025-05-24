import type { Command } from '../../shared/interfaces.js'

/**
 * UpdateUserProfileDTO
 *
 * Data Transfer Object for updating user profile information (username, email).
 * Used by UpdateUserProfileCommand.
 */
export class UpdateUserProfileDTO implements Command {
  constructor(
    public readonly userId: number,
    public readonly username?: string,
    public readonly email?: string
  ) {
    this.validate()
  }

  private validate(): void {
    if (this.userId < 1) {
      throw new Error('Invalid user ID')
    }

    if (this.username !== undefined && this.username.trim().length === 0) {
      throw new Error('Username cannot be empty')
    }

    if (this.email !== undefined && this.email.trim().length === 0) {
      throw new Error('Email cannot be empty')
    }

    // Basic email validation
    if (this.email !== undefined) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(this.email)) {
        throw new Error('Invalid email format')
      }
    }
  }
}
