/**
 * Task Types — Plain data interfaces for task domain rules.
 *
 * 100% pure, no framework dependencies.
 * Used as input to task permission policies and state machine.
 */

import type { DatabaseId } from '#types/database'

/**
 * Pre-fetched data needed for task permission decisions.
 *
 * All fields are primitive types (string, boolean, null).
 * The command is responsible for fetching these from the database
 * before calling any permission policy function.
 */
export interface TaskPermissionContext {
  /** ID of the user attempting the action */
  actorId: DatabaseId
  /** User's system_role (e.g., 'superadmin', 'system_admin', 'registered_user') */
  actorSystemRole: string | null
  /** User's org_role in the task's organization (e.g., 'org_owner', 'org_admin', 'org_member') */
  actorOrgRole: string | null
  /** User's project_role in the task's project (e.g., 'project_owner', 'project_manager') */
  actorProjectRole: string | null
  /** Who created the task */
  taskCreatorId: DatabaseId
  /** Who is currently assigned to the task */
  taskAssignedTo: DatabaseId | null
  /** Organization the task belongs to */
  taskOrganizationId: DatabaseId
  /** Project the task belongs to. Application layer now requires every task to have one. */
  taskProjectId: DatabaseId | null
  /** Whether the actor has an active TaskAssignment for this task */
  isActiveAssignee: boolean
}

/**
 * Result type for field-level update permission check.
 * When an org admin/owner updates a task they don't own/aren't assigned to,
 * they may only update a restricted set of fields.
 */
export type UpdateFieldsResult =
  | { allowed: true; fieldRestrictions: null }
  | { allowed: true; fieldRestrictions: readonly string[] }
  | { allowed: false; reason: string; code: 'FORBIDDEN' }
