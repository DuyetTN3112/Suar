import { formatRoleLabel } from '#modules/authorization/public_contracts/access_surface'
import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { OrganizationRole } from '#modules/organizations/public_contracts/access/organization_constants'

/**
 * DTO for inviting a user to an organization
 *
 * Current persistence: pending organization_users membership with invited_by metadata.
 * v3: Role is inline VARCHAR (OrganizationRole enum string)
 *
 * @example
 * const dto = new InviteUserDTO('org-uuid', 'user@example.com', OrganizationRole.MEMBER, 'Welcome!')
 */
export class InviteUserDTO {
  public readonly organizationId: string
  public readonly email: string
  public readonly roleId: string
  public readonly allowedRoleIds: string[]
  public readonly message?: string

  constructor(
    organizationId: string,
    email: string,
    roleId: string = OrganizationRole.MEMBER,
    allowedRoleIdsOrMessage: string[] | string = [OrganizationRole.ADMIN, OrganizationRole.MEMBER],
    message?: string
  ) {
    this.organizationId = organizationId
    this.email = email
    this.roleId = roleId
    this.allowedRoleIds = Array.isArray(allowedRoleIdsOrMessage)
      ? allowedRoleIdsOrMessage
      : [OrganizationRole.ADMIN, OrganizationRole.MEMBER]
    const resolvedMessage = Array.isArray(allowedRoleIdsOrMessage) ? message : allowedRoleIdsOrMessage
    if (resolvedMessage !== undefined) {
      this.message = resolvedMessage
    }
    this.validate()
  }

  static fromValidatedPayload(payload: {
    organization_id: string
    email: string
    role_id?: string
    allowed_role_ids?: string[]
    message?: string
  }): InviteUserDTO {
    return new InviteUserDTO(
      payload.organization_id,
      payload.email,
      payload.role_id ?? OrganizationRole.MEMBER,
      payload.allowed_role_ids ?? [OrganizationRole.ADMIN, OrganizationRole.MEMBER],
      payload.message
    )
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

    const validRoles = this.allowedRoleIds
    if (!validRoles.includes(this.roleId)) {
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
    return formatRoleLabel(this.roleId)
  }

  /**
   * Helper: Get Vietnamese role name
   */
  getRoleNameVi(): string {
    const roleNames: Record<string, string> = {
      [OrganizationRole.ADMIN]: 'Quản trị viên',
      [OrganizationRole.MEMBER]: 'Thành viên',
    }
    return roleNames[this.roleId] ?? formatRoleLabel(this.roleId)
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
   * Helper: Get human-readable summary
   */
  getSummary(): string {
    return `Invited ${this.getNormalizedEmail()} as ${this.getRoleName()} to organization ${this.organizationId}`
  }
}
