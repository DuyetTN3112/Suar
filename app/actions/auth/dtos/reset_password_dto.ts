import type { Command } from '../../shared/interfaces.js'

/**
 * ResetPasswordDTO
 *
 * Data Transfer Object for resetting password with token.
 * Validates token and new password.
 */
export class ResetPasswordDTO implements Command {
  public readonly token: string
  public readonly newPassword: string
  public readonly ipAddress: string

  constructor(data: { token: string; newPassword: string; ipAddress: string }) {
    this.token = this.validateToken(data.token)
    this.newPassword = this.validatePassword(data.newPassword)
    this.ipAddress = data.ipAddress
  }

  private validateToken(token: string): string {
    if (!token || typeof token !== 'string') {
      throw new Error('Token là bắt buộc')
    }
    if (token.length < 10) {
      throw new Error('Token không hợp lệ')
    }
    return token
  }

  private validatePassword(password: string): string {
    if (!password || typeof password !== 'string') {
      throw new Error('Mật khẩu mới là bắt buộc')
    }
    if (password.length < 8) {
      throw new Error('Mật khẩu phải có ít nhất 8 ký tự')
    }
    // Check for at least one number and one letter
    if (!/(?=.*[a-zA-Z])(?=.*[0-9])/.test(password)) {
      throw new Error('Mật khẩu phải chứa ít nhất 1 chữ cái và 1 số')
    }
    return password
  }

  public toObject() {
    return {
      token: this.token,
      newPassword: this.newPassword,
      ipAddress: this.ipAddress,
    }
  }
}
