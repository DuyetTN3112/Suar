/**
 * Task Types — Plain data interfaces for task domain rules.
 *
 * 100% pure, no framework dependencies.
 * Used as input to task permission policies and state machine.
 */


/**
 * Pre-fetched data needed for task permission decisions.
 *
 * All fields are primitive types (string, boolean, null).
 * The command is responsible for fetching these from the database
 * before calling any permission policy function.
 */
export interface TaskPermissionContext {
  /** ID of the user attempting the action */
  actorId: string
  /** User's system_role (e.g., 'superadmin', 'system_admin', 'registered_user') */
  actorSystemRole: string | null
  /** User's org_role in the task's organization (e.g., 'org_owner', 'org_admin', 'org_member') */
  actorOrgRole: string | null
  /** User's project_role in the task's project (e.g., 'project_owner', 'project_manager') */
  actorProjectRole: string | null
  /** Who created the task */
  taskCreatorId: string
  /** Who is currently assigned to the task */
  taskAssignedTo: string | null
  /** Organization the task belongs to */
  taskOrganizationId: string
  /** Project the task belongs to. Application layer now requires every task to have one. */
  taskProjectId: string | null
  /** Whether the actor has an active TaskAssignment for this task */
  isActiveAssignee: boolean
}

export type TaskCollectionScopeFallback = 'none' | 'own_only'

export interface TaskCollectionAccessContext {
  actorId: string
  actorSystemRole: string | null
  actorOrgRole: string | null
  unaffiliatedScope: TaskCollectionScopeFallback
}

export interface TaskCreatePermissionContext {
  actorSystemRole: string | null
  actorOrgRole: string | null
  actorProjectRole: string | null
  projectId: string | null
}

export type TaskCollectionReadScope =
  | { type: 'all' }
  | { type: 'none' }
  | { type: 'own_only'; actorId: string }
  | { type: 'own_or_assigned'; actorId: string }

/**
 * Result type for field-level update permission check.
 * When an org admin/owner updates a task they don't own/aren't assigned to,
 * they may only update a restricted set of fields.
 */
export type UpdateFieldsResult =
  | { allowed: true; fieldRestrictions: null }
  | { allowed: true; fieldRestrictions: readonly string[] }
  | { allowed: false; reason: string; code: 'FORBIDDEN' }
