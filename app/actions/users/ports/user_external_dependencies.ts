import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { DateTime } from 'luxon'

import type { DatabaseId } from '#types/database'

export interface PendingApprovalUser {
  id: DatabaseId
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
  id: DatabaseId
  skill_name: string
  category_code: string
}

export interface UserSkillDetail {
  id: DatabaseId
  skill_id: DatabaseId
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
    userId: DatabaseId,
    organizationId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<UserOrganizationMembershipInfo | null>

  approveMembership(
    userId: DatabaseId,
    organizationId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<void>

  listPendingApprovalUsers(
    organizationId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<PendingApprovalUser[]>

  countPendingApprovalUsers(
    organizationId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<number>
}

export interface UserSkillReader {
  findActiveSkillById(
    skillId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<UserActiveSkillInfo | null>

  listUserSkillDetails(
    userId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<UserSkillDetail[]>
}

export interface UserPermissionReader {
  checkOrgPermission(
    userId: DatabaseId,
    organizationId: DatabaseId,
    permission: string,
    trx?: TransactionClientContract
  ): Promise<boolean>

  isSystemSuperadmin(userId: DatabaseId, trx?: TransactionClientContract): Promise<boolean>
}

export interface UserExternalDependencies {
  organizationMembership: UserOrganizationMembershipReaderWriter
  skill: UserSkillReader
  permission: UserPermissionReader
}
