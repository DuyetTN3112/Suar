/**
 * Organization Types — Plain data interfaces for organization domain rules.
 *
 * 100% pure, no framework dependencies.
 */

import type { DatabaseId } from '#types/database'

/**
 * Context for ownership transfer decision.
 */
export interface OrgOwnershipTransferContext {
  actorId: DatabaseId
  currentOwnerId: DatabaseId
  newOwnerId: DatabaseId
  /** org_role of the new owner (null if not a member) */
  newOwnerRole: string | null
  /** Whether the new owner is an approved member */
  isNewOwnerApprovedMember: boolean
}

/**
 * Context for member removal decision.
 */
export interface OrgMemberRemovalContext {
  actorId: DatabaseId
  /** org_role of the actor performing the removal */
  actorOrgRole: string | null
  targetUserId: DatabaseId
  /** org_role of the member being removed */
  targetOrgRole: string
}

/**
 * Context for organization deletion decision.
 */
export interface OrgDeletionContext {
  actorId: DatabaseId
  /** org_role of the actor */
  actorOrgRole: string | null
  /** Number of active (non-deleted, non-cancelled) projects */
  activeProjectCount: number
}

/**
 * Context for member role update decision.
 */
export interface OrgRoleChangeContext {
  /** org_role of the actor performing the change */
  actorOrgRole: string
  /** Current org_role of the target user */
  targetCurrentRole: string
  /** Desired new org_role for the target user */
  targetNewRole: string
  /** Whether the actor is changing their own role */
  isSelfUpdate: boolean
}

/**
 * Context for adding a member to an organization.
 */
export interface OrgMemberAddContext {
  /** org_role of the actor performing the addition */
  actorOrgRole: string | null
  /** Role to assign to the new member */
  targetRoleId: string
  /** Whether the target user is already a member */
  isAlreadyMember: boolean
}

/**
 * Context for processing a join request.
 */
export interface OrgJoinRequestProcessContext {
  /** org_role of the actor processing the request */
  actorOrgRole: string | null
  /** Current status of the join request */
  requestStatus: string
  /** Whether the target user is already a member (relevant when approving) */
  isTargetAlreadyMember: boolean
}

/**
 * Context for creating a join request.
 */
export interface OrgJoinRequestEligibility {
  /** Whether the user is already a member */
  isAlreadyMember: boolean
  /** Whether the user already has a pending request */
  hasPendingRequest: boolean
}
