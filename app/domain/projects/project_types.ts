/**
 * Project Types — Plain data interfaces for project domain rules.
 *
 * 100% pure, no framework dependencies.
 * Used as input to project permission policies and state rules.
 */

import type { DatabaseId } from '#types/database'

/**
 * Pre-fetched data needed for project permission decisions.
 *
 * All fields are primitive types (string, boolean, null).
 * The command is responsible for fetching these from the database
 * before calling any permission policy function.
 */
export interface ProjectPermissionContext {
  /** ID of the user attempting the action */
  actorId: DatabaseId
  /** User's system_role (e.g., 'superadmin', 'system_admin', 'registered_user') */
  actorSystemRole: string | null
  /** User's org_role in the project's organization */
  actorOrgRole: string | null
  /** User's project_role in this project */
  actorProjectRole: string | null
  /** Who created the project */
  projectCreatorId: DatabaseId
  /** Who owns the project */
  projectOwnerId: DatabaseId
  /** Organization the project belongs to */
  projectOrganizationId: DatabaseId
}

/**
 * Context for project ownership transfer decision.
 */
export interface ProjectOwnershipTransferContext {
  actorId: DatabaseId
  /** Actor's org_role in the project's organization */
  actorOrgRole: string | null
  /** Current project owner */
  projectOwnerId: DatabaseId
  /** Proposed new owner */
  newOwnerId: DatabaseId
  /** Whether the new owner is an approved org member */
  isNewOwnerOrgMember: boolean
}

/**
 * Context for project deletion decision.
 */
export interface ProjectDeletionContext {
  actorId: DatabaseId
  actorSystemRole: string | null
  actorOrgRole: string | null
  projectOwnerId: DatabaseId
  projectCreatorId: DatabaseId
  /** Number of incomplete (non-done, non-cancelled) tasks */
  incompleteTaskCount: number
}

/**
 * Context for project member addition decision.
 */
export interface ProjectMemberAddContext {
  actorId: DatabaseId
  actorSystemRole: string | null
  actorOrgRole: string | null
  projectOwnerId: DatabaseId
  projectCreatorId: DatabaseId
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
  actorId: DatabaseId
  actorSystemRole: string | null
  actorOrgRole: string | null
  projectOwnerId: DatabaseId
  projectCreatorId: DatabaseId
  /** User being removed */
  targetUserId: DatabaseId
}

/**
 * Result type for field-level update permission check.
 */
export type ProjectUpdateFieldsResult =
  | { allowed: true; fieldRestrictions: null }
  | { allowed: true; fieldRestrictions: readonly string[] }
  | { allowed: false; reason: string; code: 'FORBIDDEN' }
