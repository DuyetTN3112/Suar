import { ProjectRole } from '../../public_contracts/project_constants.js'
import type { ProjectPermissionContext } from '../project-context/project_types.js'

import { ProjectOrgRole } from './role_contracts.js'

import type { PolicyResult } from '#modules/authorization/public_contracts/policy_result'
import { PolicyResult as PR } from '#modules/authorization/public_contracts/policy_result'

export const isSameId = (a: string, b: string): boolean => a === b

export function isOrgOwnerOrAdmin(orgRole: string | null): boolean {
  return orgRole === ProjectOrgRole.OWNER || orgRole === ProjectOrgRole.ADMIN
}

export function canManageProject(ctx: ProjectPermissionContext): boolean {
  if (isSameId(ctx.projectOwnerId, ctx.actorId)) return true
  if (isSameId(ctx.projectCreatorId, ctx.actorId)) return true
  if (isOrgOwnerOrAdmin(ctx.actorOrgRole)) return true
  return false
}

/**
 * Check if actor can manage project members (add/remove/change role).
 *
 * Priority:
 * 1. Project owner → allow
 * 2. Project creator → allow
 * 3. Org owner/admin → allow
 * 4. Deny
 */
export function canManageProjectMembers(ctx: ProjectPermissionContext): PolicyResult {
  if (canManageProject(ctx)) return PR.allow()
  return PR.deny('Chỉ owner hoặc admin mới có thể quản lý thành viên dự án')
}

export { ProjectRole }
