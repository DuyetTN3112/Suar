import type { OrganizationMemberIdentity } from './types'

export function getMemberDisplayName(member: OrganizationMemberIdentity): string {
  return member.username || member.email
}
