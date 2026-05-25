export type AdminUserPolicyDenial =
  | 'self_role_change_forbidden'
  | 'superadmin_promotion_requires_superadmin'
  | 'self_status_change_forbidden'
  | 'superadmin_status_change_requires_superadmin'

export type AdminUserPolicyDecision =
  | { allowed: true }
  | { allowed: false; reason: AdminUserPolicyDenial }

export function decideSystemRoleChange(input: {
  actorId: string
  actorSystemRole: string
  targetUserId: string
  requestedSystemRole: string
}): AdminUserPolicyDecision {
  if (input.actorId === input.targetUserId) {
    return { allowed: false, reason: 'self_role_change_forbidden' }
  }
  if (
    input.requestedSystemRole === 'superadmin' &&
    input.actorSystemRole !== 'superadmin'
  ) {
    return {
      allowed: false,
      reason: 'superadmin_promotion_requires_superadmin',
    }
  }
  return { allowed: true }
}

export function decideAccountStatusChange(input: {
  actorId: string
  actorSystemRole: string
  targetUserId: string
  targetSystemRole: string
}): AdminUserPolicyDecision {
  if (input.actorId === input.targetUserId) {
    return { allowed: false, reason: 'self_status_change_forbidden' }
  }
  if (
    input.targetSystemRole === 'superadmin' &&
    input.actorSystemRole !== 'superadmin'
  ) {
    return {
      allowed: false,
      reason: 'superadmin_status_change_requires_superadmin',
    }
  }
  return { allowed: true }
}
