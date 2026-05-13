import ValidationException from '#exceptions/validation_exception'
import { formatRoleLabel } from '#libs/access_surface'
import { OrganizationRole } from '#modules/organizations/constants/organization_constants'
import type { DatabaseId } from '#types/database'

export interface UpdateMemberRoleRecord {
  org_role: string
}

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
    public readonly newRoleId: string,
    public readonly allowedRoleIds: string[] = [OrganizationRole.ADMIN, OrganizationRole.MEMBER]
  ) {
    this.validate()
  }

  static fromValidatedPayload(payload: {
    organization_id: DatabaseId
    user_id: DatabaseId
    role_id: string
    allowed_role_ids?: string[]
  }): UpdateMemberRoleDTO {
    return new UpdateMemberRoleDTO(
      payload.organization_id,
      payload.user_id,
      payload.role_id,
      payload.allowed_role_ids ?? [OrganizationRole.ADMIN, OrganizationRole.MEMBER]
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

    // User ID validation (required)
    if (!this.userId) {
      throw new ValidationException('User ID is required')
    }

    // New role validation (required, must be valid role, cannot be Owner)
    if (!this.newRoleId) {
      throw new ValidationException('New role is required')
    }

    const validRoles = this.allowedRoleIds
    if (!validRoles.includes(this.newRoleId)) {
      throw new ValidationException(
        `New role must be one of: ${validRoles.join(', ')} (cannot promote to Owner)`
      )
    }
  }

  /**
   * Helper: Get role name
   */
  getRoleName(): string {
    return formatRoleLabel(this.newRoleId)
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
    return roleNames[this.newRoleId] ?? formatRoleLabel(this.newRoleId)
  }

  /**
   * Helper: Check if new role is elevated (Admin)
   */
  isElevatedRole(): boolean {
    return this.newRoleId === 'org_admin'
  }

  /**
   * Helper: Check if new role is basic (Member)
   */
  isBasicRole(): boolean {
    return this.newRoleId === 'org_member'
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
  toObject(): UpdateMemberRoleRecord {
    return {
      org_role: this.newRoleId,
    }
  }

  /**
   * Helper: Get human-readable summary
   */
  getSummary(currentRoleName?: string): string {
    const action = currentRoleName ? `from ${currentRoleName} to` : 'to'
    return `Updated user ${this.userId}'s role ${action} ${this.getRoleName()} in organization ${this.organizationId}`
  }
}
