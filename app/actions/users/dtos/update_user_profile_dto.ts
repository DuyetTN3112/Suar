import type { Command } from '../../shared/interfaces.js'
import type User from '#models/user'
import type { DatabaseId } from '#types/database'
import ValidationException from '#exceptions/validation_exception'

/**
 * UpdateUserProfileDTO
 *
 * Data Transfer Object for updating user profile information (username, email).
 * Used by UpdateUserProfileCommand.
 */
export class UpdateUserProfileDTO implements Command, Partial<Pick<User, 'username' | 'email'>> {
  constructor(
    public readonly userId: DatabaseId,
    public readonly username?: string,
    public readonly email?: string
  ) {
    this.validate()
  }

  private validate(): void {
    if (Number(this.userId) < 1) {
      throw new ValidationException('Invalid user ID')
    }

    if (this.username !== undefined && this.username.trim().length === 0) {
      throw new ValidationException('Username cannot be empty')
    }

    if (this.email !== undefined && this.email.trim().length === 0) {
      throw new ValidationException('Email cannot be empty')
    }

    // Basic email validation
    if (this.email !== undefined) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(this.email)) {
        throw new ValidationException('Invalid email format')
      }
    }
  }
}
