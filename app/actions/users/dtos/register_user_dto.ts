import type { Command } from '../../shared/interfaces.js'

export class RegisterUserDTO implements Command {
  constructor(
    public readonly username: string,
    public readonly email: string,
    public readonly roleId: number,
    public readonly statusId: number
  ) {
    this.validate()
  }

  private validate(): void {
    if (!this.email.includes('@')) {
      throw new Error('Invalid email format')
    }

    if (this.username.length < 3) {
      throw new Error('Username must be at least 3 characters')
    }

    if (!this.username || this.username.trim().length === 0) {
      throw new Error('Username is required')
    }
  }
}
