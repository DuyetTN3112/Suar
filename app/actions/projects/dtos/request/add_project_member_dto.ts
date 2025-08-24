import { ProjectRole } from '#constants/project_constants'
import ValidationException from '#exceptions/validation_exception'
import type { DatabaseId } from '#types/database'

/**
 * DTO for adding a member to a project
 *
 * v3: Uses inline project_role VARCHAR column (no FK to project_roles table)
 */
export interface AddProjectMemberDTOInterface {
  project_id: DatabaseId
  user_id: DatabaseId
  project_role: ProjectRole
}

export class AddProjectMemberDTO implements AddProjectMemberDTOInterface {
  public readonly project_id: DatabaseId
  public readonly user_id: DatabaseId
  public readonly project_role: ProjectRole

  constructor(
    data: Partial<AddProjectMemberDTOInterface> & { project_id: DatabaseId; user_id: DatabaseId }
  ) {
    this.validateInput(data)

    this.project_id = data.project_id
    this.user_id = data.user_id
    this.project_role = data.project_role ?? ProjectRole.MEMBER
  }

  /**
   * Validate input data
   */
  private validateInput(data: Partial<AddProjectMemberDTOInterface>): void {
    // Project ID validation
    if (!data.project_id) {
      throw new ValidationException('ID dự án không hợp lệ')
    }

    // User ID validation
    if (!data.user_id) {
      throw new ValidationException('ID người dùng không hợp lệ')
    }

    // Role validation (if provided) - check it's a valid ProjectRole string
    if (data.project_role !== undefined) {
      const validRoles = Object.values(ProjectRole) as string[]
      if (!validRoles.includes(data.project_role)) {
        throw new ValidationException('Vai trò dự án không hợp lệ')
      }
    }
  }

  /**
   * Check if the role is owner
   */
  public isOwnerRole(): boolean {
    return this.project_role === ProjectRole.OWNER
  }

  /**
   * Check if the role is manager
   */
  public isManagerRole(): boolean {
    return this.project_role === ProjectRole.MANAGER
  }

  /**
   * Get role display name — v3: returns the role string directly
   */
  public getRoleDisplayName(): string {
    return this.project_role
  }

  /**
   * Convert to plain object for database insertion
   */
  public toObject(): Record<string, unknown> {
    return {
      project_id: this.project_id,
      user_id: this.user_id,
      project_role: this.project_role,
    }
  }

  /**
   * Get audit log message
   */
  public getAuditMessage(userName?: string, roleName?: string): string {
    const userInfo = userName ?? `User ID ${this.user_id}`
    const roleInfo = roleName ?? this.project_role
    return `Thêm ${userInfo} vào dự án với vai trò ${roleInfo}`
  }
}
