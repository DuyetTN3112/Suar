import type { Command } from '../../shared/interfaces.js'

/**
 * AuthenticateUserDTO
 *
 * Data Transfer Object for user authentication (login).
 * Validates email, password, and optional remember flag.
 */
export class AuthenticateUserDTO implements Command {
  public readonly email: string
  public readonly password: string
  public readonly remember: boolean
  public readonly ipAddress: string

  constructor(data: { email: string; password: string; remember?: boolean; ipAddress: string }) {
    this.email = this.validateEmail(data.email)
    this.password = this.validatePassword(data.password)
    this.remember = data.remember ?? false
    this.ipAddress = data.ipAddress
    this.validate()
  }

  /**
   * Validate email format
   */
  private validateEmail(email: string): string {
    if (!email || typeof email !== 'string') {
      throw new Error('Email là bắt buộc')
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      throw new Error('Email không hợp lệ')
    }

    return email.toLowerCase().trim()
  }

  /**
   * Validate password
   */
  private validatePassword(password: string): string {
    if (!password || typeof password !== 'string') {
      throw new Error('Mật khẩu là bắt buộc')
    }

    if (password.length < 3) {
      throw new Error('Mật khẩu phải có ít nhất 3 ký tự')
    }

    return password
  }

  /**
   * Additional validation
   */
  private validate(): void {
    if (!this.ipAddress) {
      throw new Error('IP address is required for rate limiting')
    }
  }

  /**
   * Get rate limit key for this authentication attempt
   */
  public getRateLimitKey(): string {
    return `login_${this.ipAddress}_${this.email}`
  }

  /**
   * Convert to plain object
   */
  public toObject() {
    return {
      email: this.email,
      password: this.password,
      remember: this.remember,
      ipAddress: this.ipAddress,
    }
  }
}
