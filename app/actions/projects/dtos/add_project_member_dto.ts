import ProjectRoleModel from '#models/project_role'
import { ProjectRole } from '#constants/project_constants'
import type { DatabaseId } from '#types/database'
import ValidationException from '#exceptions/validation_exception'

/**
 * DTO for adding a member to a project
 *
 * Uses project_role_id (FK -> project_roles.id) as per database schema
 */
export interface AddProjectMemberDTOInterface {
  project_id: DatabaseId
  user_id: DatabaseId
  project_role_id: ProjectRole
}

export class AddProjectMemberDTO implements AddProjectMemberDTOInterface {
  public readonly project_id: DatabaseId
  public readonly user_id: DatabaseId
  public readonly project_role_id: ProjectRole

  constructor(
    data: Partial<AddProjectMemberDTOInterface> & { project_id: DatabaseId; user_id: DatabaseId }
  ) {
    this.validateInput(data)

    this.project_id = data.project_id
    this.user_id = data.user_id
    this.project_role_id = data.project_role_id || ProjectRole.MEMBER
  }

  /**
   * Validate input data
   */
  private validateInput(data: Partial<AddProjectMemberDTOInterface>): void {
    // Project ID validation
    if (!data.project_id || Number(data.project_id) <= 0) {
      throw new ValidationException('ID dự án không hợp lệ')
    }

    // User ID validation
    if (!data.user_id || Number(data.user_id) <= 0) {
      throw new ValidationException('ID người dùng không hợp lệ')
    }

    // Role ID validation (if provided) - check it's a valid positive number
    if (data.project_role_id !== undefined && (data.project_role_id as number) <= 0) {
      throw new ValidationException('ID vai trò dự án không hợp lệ')
    }
  }

  /**
   * Check if the role is owner
   */
  public isOwnerRole(): boolean {
    return this.project_role_id === ProjectRole.OWNER
  }

  /**
   * Check if the role is manager
   */
  public isManagerRole(): boolean {
    return this.project_role_id === ProjectRole.MANAGER
  }

  /**
   * Get role display name from database
   */
  public async getRoleDisplayName(): Promise<string> {
    const role = await ProjectRoleModel.find(this.project_role_id)
    return role?.name || `Role ID ${this.project_role_id}`
  }

  /**
   * Convert to plain object for database insertion
   */
  public toObject(): Record<string, unknown> {
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
