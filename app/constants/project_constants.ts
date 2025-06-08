/**
 * Project Constants
 *
 * Constants liên quan đến Project, ProjectMember, ProjectRole.
 * v3.0: project_roles table xóa, dùng project_role VARCHAR inline trên project_members.
 *
 * CLEANUP 2026-03-01:
 *   - XÓA projectRoleOptions, getProjectRoleName, getProjectRoleNameVi → 0 usages
 *   - XÓA isProjectManager → 0 usages (code dùng ProjectMember.isProjectManagerOrOwner())
 *   - XÓA projectVisibilityOptions, getProjectVisibilityLabel → 0 usages
 *   - XÓA projectStatusOptions → 0 usages
 *
 * @module ProjectConstants
 */

/**
 * Project Role — v3.0 string codes (thay vì integer IDs)
 * Mapped trực tiếp với project_members.project_role VARCHAR CHECK
 */
export enum ProjectRole {
  OWNER = 'project_owner',
  MANAGER = 'project_manager',
  MEMBER = 'project_member',
  VIEWER = 'project_viewer',
}

/**
 * Project Visibility
 * v3.0 CHECK: 'public', 'private', 'team'
 */
export enum ProjectVisibility {
  PRIVATE = 'private',
  TEAM = 'team',
  PUBLIC = 'public',
}

/**
 * Project Status
 * v3.0 CHECK: 'pending', 'in_progress', 'completed', 'cancelled'
 */
export enum ProjectStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}
