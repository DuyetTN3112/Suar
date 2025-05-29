import ProjectRole from '#models/project_role'

/**
 * DTO for adding a member to a project
 *
 * Uses project_role_id (FK -> project_roles.id) as per database schema
 */
export interface AddProjectMemberDTOInterface {
  project_id: number
  user_id: number
  project_role_id: number
}

export class AddProjectMemberDTO implements AddProjectMemberDTOInterface {
  public readonly project_id: number
  public readonly user_id: number
  public readonly project_role_id: number

  // Default role: project_member (id = 3)
  private static readonly DEFAULT_ROLE_ID = 3

  constructor(
    data: Partial<AddProjectMemberDTOInterface> & { project_id: number; user_id: number }
  ) {
    this.validateInput(data)

    this.project_id = data.project_id
    this.user_id = data.user_id
    this.project_role_id = data.project_role_id || AddProjectMemberDTO.DEFAULT_ROLE_ID
  }

  /**
   * Validate input data
   */
  private validateInput(data: Partial<AddProjectMemberDTOInterface>): void {
    // Project ID validation
    if (!data.project_id || data.project_id <= 0) {
      throw new Error('ID dự án không hợp lệ')
    }

    // User ID validation
    if (!data.user_id || data.user_id <= 0) {
      throw new Error('ID người dùng không hợp lệ')
    }

    // Role ID validation (if provided)
    if (data.project_role_id !== undefined && data.project_role_id <= 0) {
      throw new Error('ID vai trò dự án không hợp lệ')
    }
  }

  /**
   * Check if the role is owner (role_id = 1)
   */
  public isOwnerRole(): boolean {
    return this.project_role_id === 1
  }

  /**
   * Check if the role is manager (role_id = 2)
   */
  public isManagerRole(): boolean {
    return this.project_role_id === 2
  }

  /**
   * Get role display name from database
   */
  public async getRoleDisplayName(): Promise<string> {
    const role = await ProjectRole.find(this.project_role_id)
    return role?.name || `Role ID ${this.project_role_id}`
  }

  /**
   * Convert to plain object for database insertion
   */
  public toObject(): Record<string, any> {
    return {
      project_id: this.project_id,
      user_id: this.user_id,
      project_role_id: this.project_role_id,
    }
  }

  /**
   * Get audit log message
   */
  public getAuditMessage(userName?: string, roleName?: string): string {
    const userInfo = userName || `User ID ${this.user_id}`
    const roleInfo = roleName || `Role ID ${this.project_role_id}`
    return `Thêm ${userInfo} vào dự án với vai trò ${roleInfo}`
  }
}
