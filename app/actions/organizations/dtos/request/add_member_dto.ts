import ValidationException from '#exceptions/validation_exception'
import { OrganizationRole } from '#modules/organizations/constants/organization_constants'
import type { DatabaseId } from '#types/database'

const VALID_ORG_ROLES = new Set<string>(Object.values(OrganizationRole))

/**
 * DTO for adding a member to an organization
 *
 * Pattern: Permission validation at DTO level (learned from Projects module)
 * v3: Role is inline VARCHAR (OrganizationRole enum string)
 * Role hierarchy: org_owner > org_admin > org_member
 *
 * @example
 * const dto = new AddMemberDTO('org-uuid', 'user-uuid', OrganizationRole.MEMBER)
 */
export class AddMemberDTO {
  constructor(
    public readonly organizationId: DatabaseId,
    public readonly userId: DatabaseId,
    public readonly roleId: string = OrganizationRole.MEMBER
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

    // User ID validation (required)
    if (!this.userId) {
      throw new ValidationException('User ID is required')
    }

    // Role validation (required, must be valid OrganizationRole)
    if (!this.roleId) {
      throw new ValidationException('Role is required')
    }

    if (!VALID_ORG_ROLES.has(this.roleId)) {
      const validRoles = [...VALID_ORG_ROLES]
      throw new ValidationException(`Role must be one of: ${validRoles.join(', ')}`)
    }

    // Cannot directly add as Owner (org_owner)
    // Owner is only set during organization creation
    if (this.roleId === 'org_owner') {
      throw new ValidationException(
        'Cannot directly add a member as Owner. Owner is set during organization creation.'
      )
    }
  }

  /**
   * Helper: Get role name from role string
   */
  getRoleName(): string {
    const roleNames: Record<string, string> = {
      [OrganizationRole.OWNER]: 'Owner',
      [OrganizationRole.ADMIN]: 'Admin',
      [OrganizationRole.MEMBER]: 'Member',
    }
    return roleNames[this.roleId] ?? 'Unknown'
  }

  /**
   * Helper: Get Vietnamese role name
   */
  getRoleNameVi(): string {
    const roleNames: Record<string, string> = {
      [OrganizationRole.OWNER]: 'Chủ sở hữu',
      [OrganizationRole.ADMIN]: 'Quản trị viên',
      [OrganizationRole.MEMBER]: 'Thành viên',
    }
    return roleNames[this.roleId] ?? 'Không xác định'
  }

  /**
   * Helper: Check if role requires elevated permissions
   * Admin is an elevated role that needs Owner approval
   */
  isElevatedRole(): boolean {
    return this.roleId === 'org_admin'
  }

  /**
   * Helper: Check if role is basic (Member)
   */
  isBasicRole(): boolean {
    return this.roleId === 'org_member'
  }

  /**
   * Helper: Convert to database object
   */
  toObject() {
    return {
      organization_id: this.organizationId,
      user_id: this.userId,
      org_role: this.roleId,
    }
  }

  /**
   * Helper: Get human-readable summary
   * Pattern: Audit logging description (learned from Tasks module)
   */
  getSummary(): string {
    return `Added user ${this.userId} as ${this.getRoleName()} to organization ${this.organizationId}`
  }
}
