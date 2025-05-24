/**
 * DTO for updating a member's role in an organization
 *
 * Pattern: Complex permission validation (learned from Projects module)
 * Business rules:
 * - Cannot change Owner's role (role_id = 1)
 * - Admin can only update roles up to their own level
 * - Cannot promote a member to Owner (use transfer ownership instead)
 *
 * @example
 * const dto = new UpdateMemberRoleDTO(1, 100, 3) // Update user 100 to Manager
 */
export class UpdateMemberRoleDTO {
  constructor(
    public readonly organizationId: number,
    public readonly userId: number,
    public readonly newRoleId: number
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

    // User ID validation (required)
    if (!this.userId || typeof this.userId !== 'number') {
      throw new Error('User ID is required')
    }

    if (this.userId <= 0) {
      throw new Error('User ID must be a positive number')
    }

    // New role ID validation (required, must be valid role)
    if (!this.newRoleId || typeof this.newRoleId !== 'number') {
      throw new Error('New role ID is required')
    }

    const validRoles = [2, 3, 4, 5] // Owner (1) not allowed
    if (!validRoles.includes(this.newRoleId)) {
      throw new Error(
        `New role ID must be one of: ${validRoles.join(', ')} (cannot promote to Owner)`
      )
    }
  }

  /**
   * Helper: Get role name from role ID
   */
  getRoleName(): string {
    const roleNames: Record<number, string> = {
      1: 'Owner',
      2: 'Admin',
      3: 'Manager',
      4: 'Member',
      5: 'Viewer',
    }
    return roleNames[this.newRoleId] || 'Unknown'
  }

  /**
   * Helper: Get Vietnamese role name
   */
  getRoleNameVi(): string {
    const roleNames: Record<number, string> = {
      1: 'Chủ sở hữu',
      2: 'Quản trị viên',
      3: 'Quản lý',
      4: 'Thành viên',
      5: 'Người xem',
    }
    return roleNames[this.newRoleId] || 'Không xác định'
  }

  /**
   * Helper: Check if new role is elevated (Admin/Manager)
   */
  isElevatedRole(): boolean {
    return this.newRoleId === 2 || this.newRoleId === 3
  }

  /**
   * Helper: Check if new role is basic (Member/Viewer)
   */
  isBasicRole(): boolean {
    return this.newRoleId === 4 || this.newRoleId === 5
  }

  /**
   * Helper: Check if this is a promotion (lower role_id = higher permission)
   * e.g., 4 (Member) -> 3 (Manager) is promotion
   */
  isPromotion(currentRoleId: number): boolean {
    return this.newRoleId < currentRoleId
  }

  /**
   * Helper: Check if this is a demotion
   * e.g., 3 (Manager) -> 4 (Member) is demotion
   */
  isDemotion(currentRoleId: number): boolean {
    return this.newRoleId > currentRoleId
  }

  /**
   * Helper: Check if role is unchanged
   */
  isUnchanged(currentRoleId: number): boolean {
    return this.newRoleId === currentRoleId
  }

  /**
   * Helper: Can an Admin perform this role update?
   * Admin can only update roles up to their own level (role_id >= 2)
   */
  canAdminUpdate(): boolean {
    return this.newRoleId >= 2
  }

  /**
   * Helper: Get action type (promotion/demotion/unchanged)
   */
  getActionType(currentRoleId: number): 'promotion' | 'demotion' | 'unchanged' {
    if (this.isPromotion(currentRoleId)) return 'promotion'
    if (this.isDemotion(currentRoleId)) return 'demotion'
    return 'unchanged'
  }

  /**
   * Helper: Convert to database object
   */
  toObject() {
    return {
      role_id: this.newRoleId,
    }
  }

  /**
   * Helper: Get human-readable summary
   * Pattern: Audit logging description (learned from Tasks module)
   */
  getSummary(currentRoleName?: string): string {
    const action = currentRoleName ? `from ${currentRoleName} to` : 'to'
    return `Updated user ${this.userId}'s role ${action} ${this.getRoleName()} in organization ${this.organizationId}`
  }
}
