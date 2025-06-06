import type { Command } from '../../shared/interfaces.js'
import ValidationException from '#exceptions/validation_exception'

/**
 * RegisterUserDTO
 *
 * v3: roleId is a SystemRoleName string, statusId is a UserStatusName string.
 * Both are inline VARCHAR on users table.
 */
export class RegisterUserDTO implements Command {
  constructor(
    public readonly username: string,
    public readonly email: string,
    public readonly roleId: string,
    public readonly statusId: string
  ) {
    this.validate()
  }

  private validate(): void {
    if (!this.email.includes('@')) {
      throw new ValidationException('Invalid email format')
    }

    if (this.username.length < 3) {
      throw new ValidationException('Username must be at least 3 characters')
    }

    if (!this.username || this.username.trim().length === 0) {
      throw new ValidationException('Username is required')
    }
  }
}
