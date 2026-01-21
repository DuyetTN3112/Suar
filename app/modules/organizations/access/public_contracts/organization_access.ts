import type { PolicyResult } from '#modules/authorization/public_contracts/policy_result'
import { PolicyResult as PR } from '#modules/authorization/public_contracts/policy_result'

export type OrgRole = 'org_owner' | 'org_admin' | 'org_member'

/**
 * Stable access decisions exposed to composition roots and other modules.
 */
export function canAccessOrganizationAdminShell(actorOrgRole: OrgRole | null): PolicyResult {
  if (actorOrgRole === 'org_owner' || actorOrgRole === 'org_admin') {
    return PR.allow()
  }

  return PR.deny('Bạn không có quyền truy cập khu vực quản trị tổ chức')
}

export function canAccessOrganizationOwnerControls(actorOrgRole: OrgRole | null): PolicyResult {
  if (actorOrgRole === 'org_owner') {
    return PR.allow()
  }

  return PR.deny('Chỉ chủ sở hữu tổ chức mới có thể truy cập khu vực này')
}
