import type { DateTime } from 'luxon'

import type { UserSkillCatalog } from './profile-skills/user_skill_catalog.js'
import type { UserTransaction } from './user_transaction.js'

export interface PendingApprovalUser {
  id: string
  email: string
  username: string
  system_role: string
  status: string
  avatar_url: string | null
  created_at: string
}

export interface UserOrganizationMembershipInfo {
  status: string | null
}

export interface UserOrganizationSummary {
  id: string
  name: string
  slug: string
  logo: string | null
}

export interface UserSkillDetail {
  id: string
  skill_id: string
  verified_public_proficiency_code: string
  source: 'imported' | 'reviewed'
  total_reviews: number
  avg_score: number | null
  avg_percentage: number | null
  last_reviewed_at: DateTime | null
  confidence_signal: 'low' | 'medium' | 'high' | null
  has_active_dispute: boolean
  skill: {
    skill_name: string
    skill_code: string
    category_code: string
    display_type: string
  }
}

export interface UserOrganizationMembershipReaderWriter {
  findOrganizationSummary(
    organizationId: string,
    trx?: UserTransaction
  ): Promise<UserOrganizationSummary | null>

  listMemberUserIds(
    organizationId: string,
    status?: string | null,
    trx?: UserTransaction
  ): Promise<string[]>

  findMembershipStatus(
    userId: string,
    organizationId: string,
    trx?: UserTransaction
  ): Promise<UserOrganizationMembershipInfo | null>

  approveMembership(
    userId: string,
    organizationId: string,
    trx?: UserTransaction
  ): Promise<void>

  listPendingApprovalUsers(
    organizationId: string,
    trx?: UserTransaction
  ): Promise<PendingApprovalUser[]>

  countPendingApprovalUsers(
    organizationId: string,
    trx?: UserTransaction
  ): Promise<number>
}

export interface UserSkillReader {
  resolveProficiencyLevelId(
    levelCode: string,
    trx?: UserTransaction
  ): Promise<string | null>

  listUserSkillDetails(userId: string, trx?: UserTransaction): Promise<UserSkillDetail[]>
}

export interface UserPermissionReader {
  checkOrgPermission(
    userId: string,
    organizationId: string,
    permission: string,
    trx?: UserTransaction
  ): Promise<boolean>

  isSystemSuperadmin(userId: string, trx?: UserTransaction): Promise<boolean>
}

export interface UserExternalDependencies {
  organizationMembership: UserOrganizationMembershipReaderWriter
  skill: UserSkillReader
  skillCatalog: UserSkillCatalog
  permission: UserPermissionReader
}
