/**
 * Project Types — Plain data interfaces for project domain rules.
 *
 * 100% pure, no framework dependencies.
 * Used as input to project permission policies and state rules.
 */


/**
 * Pre-fetched data needed for project permission decisions.
 *
 * All fields are primitive types (string, boolean, null).
 * The command is responsible for fetching these from the database
 * before calling any permission policy function.
 */
export interface ProjectPermissionContext {
  /** ID of the user attempting the action */
  actorId: string
  /** User's system_role (e.g., 'superadmin', 'system_admin', 'registered_user') */
  actorSystemRole: string | null
  /** User's org_role in the project's organization */
  actorOrgRole: string | null
  /** User's project_role in this project */
  actorProjectRole: string | null
  /** Who created the project */
  projectCreatorId: string
  /** Who owns the project */
  projectOwnerId: string
  /** Organization the project belongs to */
  projectOrganizationId: string
}

/**
 * Context for project ownership transfer decision.
 */
export interface ProjectOwnershipTransferContext {
  actorId: string
  /** Actor's org_role in the project's organization */
  actorOrgRole: string | null
  /** Current project owner */
  projectOwnerId: string
  /** Proposed new owner */
  newOwnerId: string
  /** Whether the new owner is an approved org member */
  isNewOwnerOrgMember: boolean
}

/**
 * Context for project deletion decision.
 */
export interface ProjectDeletionContext {
  actorId: string
  actorSystemRole: string | null
  actorOrgRole: string | null
  projectOwnerId: string
  projectCreatorId: string
  /** Number of incomplete (non-done, non-cancelled) tasks */
  incompleteTaskCount: number
}

/**
 * Context for project member addition decision.
 */
export interface ProjectMemberAddContext {
  actorId: string
  actorSystemRole: string | null
  actorOrgRole: string | null
  projectOwnerId: string
  projectCreatorId: string
  /** Role to assign to the new member */
  targetRole: string
  /** Whether the target user is an approved org member */
  isTargetOrgMember: boolean
  /** Whether the target user is already a project member */
  isAlreadyMember: boolean
}

/**
 * Context for project member removal decision.
 */
export interface ProjectMemberRemovalContext {
  actorId: string
  actorSystemRole: string | null
  actorOrgRole: string | null
  projectOwnerId: string
  projectCreatorId: string
  /** User being removed */
  targetUserId: string
}

/**
 * Result type for field-level update permission check.
 */
export type ProjectUpdateFieldsResult =
  | { allowed: true; fieldRestrictions: null }
  | { allowed: true; fieldRestrictions: readonly string[] }
  | { allowed: false; reason: string; code: 'FORBIDDEN' }
