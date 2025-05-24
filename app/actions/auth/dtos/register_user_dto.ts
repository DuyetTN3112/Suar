import type { Command } from '../../shared/interfaces.js'

/**
 * RegisterUserDTO
 *
 * Data Transfer Object for user registration.
 * Validates all required fields for creating a new user account.
 */
export class RegisterUserDTO implements Command {
  public readonly firstName: string
  public readonly lastName: string
  public readonly username: string
  public readonly email: string
  public readonly password: string

  constructor(data: {
    firstName: string
    lastName: string
    username: string
    email: string
    password: string
  }) {
    this.firstName = this.validateName(data.firstName, 'First name')
    this.lastName = this.validateName(data.lastName, 'Last name')
    this.username = this.validateUsername(data.username)
    this.email = this.validateEmail(data.email)
    this.password = this.validatePassword(data.password)
  }

  private validateName(name: string, field: string): string {
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      throw new Error(`${field} là bắt buộc`)
    }
    if (name.trim().length < 2) {
      throw new Error(`${field} phải có ít nhất 2 ký tự`)
    }
    return name.trim()
  }

  private validateUsername(username: string): string {
    if (!username || typeof username !== 'string') {
      throw new Error('Username là bắt buộc')
    }
    if (username.length < 3) {
      throw new Error('Username phải có ít nhất 3 ký tự')
    }
    if (username.length > 30) {
      throw new Error('Username không được vượt quá 30 ký tự')
    }
    // Only allow alphanumeric and underscore
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      throw new Error('Username chỉ được chứa chữ, số và dấu gạch dưới')
    }
    return username.toLowerCase()
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

  private validatePassword(password: string): string {
    if (!password || typeof password !== 'string') {
      throw new Error('Mật khẩu là bắt buộc')
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
      firstName: this.firstName,
      lastName: this.lastName,
      username: this.username,
      email: this.email,
      password: this.password,
    }
  }
}
