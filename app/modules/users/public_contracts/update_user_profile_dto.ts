import ValidationException from '#modules/http/exceptions/validation_exception'
import type { UserRecord } from '#modules/users/types/user_records'

export class UpdateUserProfileDTO implements Partial<Pick<UserRecord, 'username' | 'email'>> {
  constructor(
    public readonly userId: string,
    public readonly username?: string,
    public readonly email?: string
  ) {
    this.validate()
  }

  private validate(): void {
    if (Number(this.userId) < 1) {
      throw new ValidationException('Invalid user ID')
    }

    if (this.username?.trim().length === 0) {
      throw new ValidationException('Username cannot be empty')
    }

    if (this.email?.trim().length === 0) {
      throw new ValidationException('Email cannot be empty')
    }

    if (this.email !== undefined) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(this.email)) {
        throw new ValidationException('Invalid email format')
      }
    }
  }
}
