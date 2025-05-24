import type { Command } from '../../shared/interfaces.js'

/**
 * RegisterUserDTO
 *
 * Data Transfer Object for registering a new user in the system.
 * Used by RegisterUserCommand.
 *
 * Validates:
 * - Email format
 * - Password strength
 * - Username length
 */
export class RegisterUserDTO implements Command {
  constructor(
    public readonly firstName: string,
    public readonly lastName: string,
    public readonly username: string,
    public readonly email: string,
    public readonly password: string,
    public readonly roleId: number,
    public readonly statusId: number,
    public readonly phoneNumber?: string,
    public readonly bio?: string,
    public readonly dateOfBirth?: string,
    public readonly language?: string
  ) {
    this.validate()
  }

  private validate(): void {
    if (!this.email.includes('@')) {
      throw new Error('Invalid email format')
    }

    if (this.password.length < 8) {
      throw new Error('Password must be at least 8 characters')
    }

    if (this.username.length < 3) {
      throw new Error('Username must be at least 3 characters')
    }

    if (!this.firstName || this.firstName.trim().length === 0) {
      throw new Error('First name is required')
    }

    if (!this.lastName || this.lastName.trim().length === 0) {
      throw new Error('Last name is required')
    }
  }
}
