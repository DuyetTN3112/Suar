import type { DatabaseId } from '#types/database'
import { OrganizationRole } from '#constants/organization_constants'
import ValidationException from '#exceptions/validation_exception'

/**
 * DTO for inviting a user to an organization
 *
 * Pattern: Email validation with token generation (learned from Auth module)
 * v3: Role is inline VARCHAR (OrganizationRole enum string)
 *
 * @example
 * const dto = new InviteUserDTO('org-uuid', 'user@example.com', OrganizationRole.MEMBER, 'Welcome!')
 */
export class InviteUserDTO {
  constructor(
    public readonly organizationId: DatabaseId,
    public readonly email: string,
    public readonly roleId: string = OrganizationRole.MEMBER,
    public readonly message?: string
  ) {
    this.validate()
  }

  /**
   * Validate all fields at construction time
   */
  private validate(): void {
    // Organization ID validation (required)
    if (!this.organizationId) {
      throw new ValidationException('Organization ID is required')
    }

    // Email validation (required)
    if (!this.email || typeof this.email !== 'string') {
      throw new ValidationException('Email is required')
    }

    const trimmedEmail = this.email.trim()
    if (trimmedEmail.length === 0) {
      throw new ValidationException('Email cannot be empty')
    }

    if (!this.isValidEmail(trimmedEmail)) {
      throw new ValidationException('Invalid email format')
    }

    // Role validation (required, must be valid role, cannot invite as Owner)
    if (!this.roleId) {
      throw new ValidationException('Role is required')
    }

    const validRoles = [OrganizationRole.ADMIN, OrganizationRole.MEMBER] // Cannot invite as Owner
    if (!validRoles.includes(this.roleId as OrganizationRole)) {
      throw new ValidationException(
        `Role must be one of: ${validRoles.join(', ')} (cannot invite as Owner)`
      )
    }

    // Message validation (optional, max 500 characters)
    if (this.message !== undefined) {
      if (typeof this.message !== 'string') {
        throw new ValidationException('Invitation message must be a string')
      }

      if (this.message.trim().length > 500) {
        throw new ValidationException('Invitation message cannot exceed 500 characters')
      }
    }
  }

  /**
   * Helper: Validate email format
   * Pattern: Email validation (learned from Auth module)
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  /**
   * Helper: Get normalized email (lowercase, trimmed)
   */
  getNormalizedEmail(): string {
    return this.email.trim().toLowerCase()
  }

  /**
   * Helper: Get role name from role ID
   */
  getRoleName(): string {
    const roleNames: Record<string, string> = {
      [OrganizationRole.ADMIN]: 'Admin',
      [OrganizationRole.MEMBER]: 'Member',
    }
    return roleNames[this.roleId] || 'Unknown'
  }

  /**
   * Helper: Get Vietnamese role name
   */
  getRoleNameVi(): string {
    const roleNames: Record<string, string> = {
      [OrganizationRole.ADMIN]: 'Quản trị viên',
      [OrganizationRole.MEMBER]: 'Thành viên',
    }
    return roleNames[this.roleId] || 'Không xác định'
  }

  /**
   * Helper: Check if invitation message is provided
   */
  hasMessage(): boolean {
    return this.message !== undefined && this.message.trim().length > 0
  }

  /**
   * Helper: Get normalized message
   */
  getNormalizedMessage(): string | null {
    if (!this.hasMessage()) return null
    return this.message?.trim() ?? null
  }

  /**
   * Helper: Generate invitation token
   * Pattern: Token generation (learned from Auth module)
   */
  static generateToken(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let token = ''
    for (let i = 0; i < 32; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return token
  }

  /**
   * Helper: Get expiration date (7 days from now)
   * Pattern: Token expiration (learned from Auth module)
   */
  static getExpirationDate(): Date {
    const date = new Date()
    date.setDate(date.getDate() + 7)
    return date
  }

  /**
   * Helper: Convert to database object
   */
  toObject() {
    return {
      organization_id: this.organizationId,
      email: this.getNormalizedEmail(),
      org_role: this.roleId,
      token: InviteUserDTO.generateToken(),
      expires_at: InviteUserDTO.getExpirationDate(),
      message: this.getNormalizedMessage(),
    }
  }

  /**
   * Helper: Get human-readable summary
   */
  getSummary(): string {
    return `Invited ${this.getNormalizedEmail()} as ${this.getRoleName()} to organization ${this.organizationId}`
  }
}
