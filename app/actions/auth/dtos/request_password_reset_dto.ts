import type { Command } from '../../shared/interfaces.js'

/**
 * RequestPasswordResetDTO
 *
 * Data Transfer Object for password reset request.
 * User provides email to receive reset link.
 */
export class RequestPasswordResetDTO implements Command {
  public readonly email: string
  public readonly ipAddress: string

  constructor(data: { email: string; ipAddress: string }) {
    this.email = this.validateEmail(data.email)
    this.ipAddress = data.ipAddress
    this.validate()
  }

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

  private validate(): void {
    if (!this.ipAddress) {
      throw new Error('IP address is required for rate limiting')
    }
  }

  /**
   * Get rate limit key for password reset requests
   */
  public getRateLimitKey(): string {
    return `password_reset_${this.ipAddress}_${this.email}`
  }

  public toObject() {
    return {
      email: this.email,
      ipAddress: this.ipAddress,
    }
  }
}
