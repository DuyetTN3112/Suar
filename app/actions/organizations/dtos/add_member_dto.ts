/**
 * DTO for adding a member to an organization
 *
 * Pattern: Permission validation at DTO level (learned from Projects module)
 * Role hierarchy: 1=Owner, 2=Admin, 3=Manager, 4=Member, 5=Viewer
 *
 * @example
 * const dto = new AddMemberDTO(1, 100, 4) // Add user 100 as Member to org 1
 */
export class AddMemberDTO {
  constructor(
    public readonly organizationId: number,
    public readonly userId: number,
    public readonly roleId: number = 4 // Default: Member
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

    // Role ID validation (required, must be valid role)
    if (!this.roleId || typeof this.roleId !== 'number') {
      throw new Error('Role ID is required')
    }

    const validRoles = [1, 2, 3, 4, 5]
    if (!validRoles.includes(this.roleId)) {
      throw new Error(`Role ID must be one of: ${validRoles.join(', ')}`)
    }

    // Cannot directly add as Owner (role_id = 1)
    // Owner is only set during organization creation
    if (this.roleId === 1) {
      throw new Error(
        'Cannot directly add a member as Owner. Owner is set during organization creation.'
      )
    }
  }

  /**
   * Helper: Get role name from role ID
   * Pattern: Display helpers (learned from all modules)
   */
  getRoleName(): string {
    const roleNames: Record<number, string> = {
      1: 'Owner',
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
      1: 'Chủ sở hữu',
      2: 'Quản trị viên',
      3: 'Quản lý',
      4: 'Thành viên',
      5: 'Người xem',
    }
    return roleNames[this.roleId] || 'Không xác định'
  }

  /**
   * Helper: Check if role requires elevated permissions
   * Admin and Manager are elevated roles that need Owner/Admin approval
   */
  isElevatedRole(): boolean {
    return this.roleId === 2 || this.roleId === 3
  }

  /**
   * Helper: Check if role is basic (Member or Viewer)
   */
  isBasicRole(): boolean {
    return this.roleId === 4 || this.roleId === 5
  }

  /**
   * Helper: Convert to database object
   */
  toObject() {
    return {
      organization_id: this.organizationId,
      user_id: this.userId,
      role_id: this.roleId,
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
