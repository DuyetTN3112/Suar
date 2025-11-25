import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { DateTime } from 'luxon'


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

export interface UserActiveSkillInfo {
  id: string
  skill_name: string
  category_code: string
}

export interface UserSkillDetail {
  id: string
  skill_id: string
  level_code: string
  total_reviews: number
  avg_score: number | null
  avg_percentage: number | null
  last_reviewed_at: DateTime | null
  skill: {
    skill_name: string
    skill_code: string
    category_code: string
    display_type: string
  }
}

export interface UserOrganizationMembershipReaderWriter {
  findMembershipStatus(
    userId: string,
    organizationId: string,
    trx?: TransactionClientContract
  ): Promise<UserOrganizationMembershipInfo | null>

  approveMembership(
    userId: string,
    organizationId: string,
    trx?: TransactionClientContract
  ): Promise<void>

  listPendingApprovalUsers(
    organizationId: string,
    trx?: TransactionClientContract
  ): Promise<PendingApprovalUser[]>

  countPendingApprovalUsers(
    organizationId: string,
    trx?: TransactionClientContract
  ): Promise<number>
}

export interface UserSkillReader {
  findActiveSkillById(
    skillId: string,
    trx?: TransactionClientContract
  ): Promise<UserActiveSkillInfo | null>

  listUserSkillDetails(
    userId: string,
    trx?: TransactionClientContract
  ): Promise<UserSkillDetail[]>
}

export interface UserPermissionReader {
  checkOrgPermission(
    userId: string,
    organizationId: string,
    permission: string,
    trx?: TransactionClientContract
  ): Promise<boolean>

  isSystemSuperadmin(userId: string, trx?: TransactionClientContract): Promise<boolean>
}

export interface UserExternalDependencies {
  organizationMembership: UserOrganizationMembershipReaderWriter
  skill: UserSkillReader
  permission: UserPermissionReader
}
