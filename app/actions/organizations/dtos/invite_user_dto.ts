/**
 * DTO for inviting a user to an organization
 *
 * Pattern: Email validation with token generation (learned from Auth module)
 * Creates invitation with token, expiration, and optional message
 *
 * @example
 * const dto = new InviteUserDTO(1, 'user@example.com', 4, 'Welcome to our team!')
 */
export class InviteUserDTO {
  constructor(
    public readonly organizationId: number,
    public readonly email: string,
    public readonly roleId: number = 4, // Default: Member
    public readonly message?: string
  ) {
    this.validate()
  }

  /**
   * Validate all fields at construction time
   */
  private validate(): void {
    // Organization ID validation (required)
    if (!this.organizationId || typeof this.organizationId !== 'number') {
      throw new Error('Organization ID is required')
    }

    if (this.organizationId <= 0) {
      throw new Error('Organization ID must be a positive number')
    }

    // Email validation (required)
    if (!this.email || typeof this.email !== 'string') {
      throw new Error('Email is required')
    }

    const trimmedEmail = this.email.trim()
    if (trimmedEmail.length === 0) {
      throw new Error('Email cannot be empty')
    }

    if (!this.isValidEmail(trimmedEmail)) {
      throw new Error('Invalid email format')
    }

    // Role ID validation (required, must be valid role)
    if (!this.roleId || typeof this.roleId !== 'number') {
      throw new Error('Role ID is required')
    }

    const validRoles = [2, 3, 4, 5] // Cannot invite as Owner
    if (!validRoles.includes(this.roleId)) {
      throw new Error(`Role ID must be one of: ${validRoles.join(', ')} (cannot invite as Owner)`)
    }

    // Message validation (optional, max 500 characters)
    if (this.message !== undefined && this.message !== null) {
      if (typeof this.message !== 'string') {
        throw new Error('Invitation message must be a string')
      }

      if (this.message.trim().length > 500) {
        throw new Error('Invitation message cannot exceed 500 characters')
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
    const roleNames: Record<number, string> = {
      2: 'Admin',
      3: 'Manager',
      4: 'Member',
      5: 'Viewer',
    }
    return roleNames[this.roleId] || 'Unknown'
  }

  /**
   * Helper: Get Vietnamese role name
   */
  getRoleNameVi(): string {
    const roleNames: Record<number, string> = {
      2: 'Quản trị viên',
      3: 'Quản lý',
      4: 'Thành viên',
      5: 'Người xem',
    }
    return roleNames[this.roleId] || 'Không xác định'
  }

  /**
   * Helper: Check if invitation message is provided
   */
  hasMessage(): boolean {
    return this.message !== undefined && this.message !== null && this.message.trim().length > 0
  }

  /**
   * Helper: Get normalized message
   */
  getNormalizedMessage(): string | null {
    if (!this.hasMessage()) return null
    return this.message!.trim()
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
      role_id: this.roleId,
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
