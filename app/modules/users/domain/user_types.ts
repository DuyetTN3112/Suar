/**
 * User Types — Plain data interfaces for user domain rules.
 *
 * 100% pure, no framework dependencies.
 * Used as input to user management rule functions.
 */


/**
 * Context for user approval decision.
 */
export interface UserApprovalContext {
  /** Whether the actor has the 'can_approve_members' permission */
  hasApprovePermission: boolean
  /** Current membership status of the target user */
  targetMembershipStatus: string | null
}

/**
 * Context for changing a user's system role.
 */
export interface UserRoleChangeContext {
  actorId: string
  targetUserId: string
  /** Whether the actor is a superadmin */
  isActorSuperadmin: boolean
  /** The new role to assign */
  newRole: string
}

/**
 * Context for deactivating a user.
 */
export interface UserDeactivationContext {
  actorId: string
  targetUserId: string
  /** Whether the actor is a superadmin */
  isActorSuperadmin: boolean
}
