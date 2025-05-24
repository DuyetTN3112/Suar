/**
 * DTO for adding a member to a project
 *
 * @implements {AddProjectMemberDTOInterface}
 */
export interface AddProjectMemberDTOInterface {
  project_id: number
  user_id: number
  role?: string
}

export class AddProjectMemberDTO implements AddProjectMemberDTOInterface {
  public readonly project_id: number
  public readonly user_id: number
  public readonly role: string

  // Valid member roles
  private static readonly VALID_ROLES = ['owner', 'lead', 'member', 'viewer']
  private static readonly DEFAULT_ROLE = 'member'

  constructor(data: AddProjectMemberDTOInterface) {
    this.validateInput(data)

    this.project_id = data.project_id
    this.user_id = data.user_id
    this.role = data.role || AddProjectMemberDTO.DEFAULT_ROLE
  }

  /**
   * Validate input data
   */
  private validateInput(data: AddProjectMemberDTOInterface): void {
    // Project ID validation
    if (!data.project_id || data.project_id <= 0) {
      throw new Error('ID dự án không hợp lệ')
    }

    // User ID validation
    if (!data.user_id || data.user_id <= 0) {
      throw new Error('ID người dùng không hợp lệ')
    }

    // Role validation (if provided)
    if (data.role && !AddProjectMemberDTO.VALID_ROLES.includes(data.role)) {
      throw new Error(
        `Vai trò không hợp lệ. Các vai trò hợp lệ: ${AddProjectMemberDTO.VALID_ROLES.join(', ')}`
      )
    }
  }

  /**
   * Check if the role is 'owner'
   */
  public isOwnerRole(): boolean {
    return this.role === 'owner'
  }

  /**
   * Check if the role is 'lead'
   */
  public isLeadRole(): boolean {
    return this.role === 'lead'
  }

  /**
   * Check if the role is 'viewer' (read-only)
   */
  public isViewerRole(): boolean {
    return this.role === 'viewer'
  }

  /**
   * Get role display name in Vietnamese
   */
  public getRoleDisplayName(): string {
    const roleNames: Record<string, string> = {
      owner: 'Chủ sở hữu',
      lead: 'Trưởng nhóm',
      member: 'Thành viên',
      viewer: 'Người xem',
    }

    return roleNames[this.role] || this.role
  }

  /**
   * Convert to plain object for database insertion
   */
  public toObject(): Record<string, any> {
    return {
      project_id: this.project_id,
      user_id: this.user_id,
      role: this.role,
    }
  }

  /**
   * Get audit log message
   */
  public getAuditMessage(userName?: string): string {
    const userInfo = userName || `User ID ${this.user_id}`
    return `Thêm ${userInfo} vào dự án với vai trò ${this.getRoleDisplayName()}`
  }
}
