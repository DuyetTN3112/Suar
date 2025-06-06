import type { DatabaseId } from '#types/database'
import { OrganizationRole } from '#constants/organization_constants'
import ValidationException from '#exceptions/validation_exception'

/**
 * DTO for updating a member's role in an organization
 *
 * Pattern: Complex permission validation (learned from Projects module)
 * v3: Role is inline VARCHAR (OrganizationRole enum string)
 * Business rules:
 * - Cannot change Owner's role (org_owner)
 * - Admin can only update roles up to their own level
 * - Cannot promote a member to Owner (use transfer ownership instead)
 *
 * @example
 * const dto = new UpdateMemberRoleDTO('org-uuid', 'user-uuid', OrganizationRole.ADMIN)
 */
export class UpdateMemberRoleDTO {
  constructor(
    public readonly organizationId: DatabaseId,
    public readonly userId: DatabaseId,
    public readonly newRoleId: string
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

    // New role validation (required, must be valid role, cannot be Owner)
    if (!this.newRoleId) {
      throw new ValidationException('New role is required')
    }

    const validRoles = [OrganizationRole.ADMIN, OrganizationRole.MEMBER] // Owner not allowed
    if (!validRoles.includes(this.newRoleId as OrganizationRole)) {
      throw new ValidationException(
        `New role must be one of: ${validRoles.join(', ')} (cannot promote to Owner)`
      )
    }
  }

  /**
   * Helper: Get role name
   */
  getRoleName(): string {
    const roleNames: Record<string, string> = {
      [OrganizationRole.OWNER]: 'Owner',
      [OrganizationRole.ADMIN]: 'Admin',
      [OrganizationRole.MEMBER]: 'Member',
    }
    return roleNames[this.newRoleId] || 'Unknown'
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
    return roleNames[this.newRoleId] || 'Không xác định'
  }

  /**
   * Helper: Check if new role is elevated (Admin)
   */
  isElevatedRole(): boolean {
    return this.newRoleId === OrganizationRole.ADMIN
  }

  /**
   * Helper: Check if new role is basic (Member)
   */
  isBasicRole(): boolean {
    return this.newRoleId === OrganizationRole.MEMBER
  }

  /**
   * Helper: Check if this is a promotion based on role hierarchy
   */
  isPromotion(currentRole: string): boolean {
    const hierarchy: Record<string, number> = {
      [OrganizationRole.OWNER]: 0,
      [OrganizationRole.ADMIN]: 1,
      [OrganizationRole.MEMBER]: 2,
    }
    return (hierarchy[this.newRoleId] ?? 99) < (hierarchy[currentRole] ?? 99)
  }

  /**
   * Helper: Check if this is a demotion
   */
  isDemotion(currentRole: string): boolean {
    const hierarchy: Record<string, number> = {
      [OrganizationRole.OWNER]: 0,
      [OrganizationRole.ADMIN]: 1,
      [OrganizationRole.MEMBER]: 2,
    }
    return (hierarchy[this.newRoleId] ?? 99) > (hierarchy[currentRole] ?? 99)
  }

  /**
   * Helper: Check if role is unchanged
   */
  isUnchanged(currentRole: string): boolean {
    return this.newRoleId === currentRole
  }

  /**
   * Helper: Get action type (promotion/demotion/unchanged)
   */
  getActionType(currentRole: string): 'promotion' | 'demotion' | 'unchanged' {
    if (this.isPromotion(currentRole)) return 'promotion'
    if (this.isDemotion(currentRole)) return 'demotion'
    return 'unchanged'
  }

  /**
   * Helper: Convert to database object
   */
  toObject() {
    return {
      org_role: this.newRoleId,
    }
  }

  /**
   * Helper: Get human-readable summary
   */
  getSummary(currentRoleName?: string): string {
    const action = currentRoleName ? `from ${currentRoleName} to` : 'to'
    return `Updated user ${String(this.userId)}'s role ${action} ${this.getRoleName()} in organization ${String(this.organizationId)}`
  }
}
