import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import type {
  PendingApprovalUser,
  UserActiveSkillInfo,
  UserExternalDependencies,
  UserOrganizationMembershipInfo,
  UserOrganizationMembershipReaderWriter,
  UserPermissionReader,
  UserSkillDetail,
  UserSkillReader,
} from './user_external_dependencies.js'

import { organizationPublicApi } from '#actions/organizations/public_api'
import { skillPublicApi } from '#actions/skills/public_api'
import { userPublicApi } from '#actions/users/public_api'
import type { DatabaseId } from '#types/database'

export class InfraUserOrganizationMembershipReaderWriter implements UserOrganizationMembershipReaderWriter {
  async findMembershipStatus(
    userId: DatabaseId,
    organizationId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<UserOrganizationMembershipInfo | null> {
    const membership = await organizationPublicApi.findMembership(organizationId, userId, trx)
    if (!membership) {
      return null
    }

    return {
      status: membership.status,
    }
  }

  async approveMembership(
    userId: DatabaseId,
    organizationId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<void> {
    await organizationPublicApi.approveMembership(organizationId, userId, trx)
  }

  async listPendingApprovalUsers(
    organizationId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<PendingApprovalUser[]> {
    const pendingMemberships = await organizationPublicApi.listPendingMembershipsWithUserInfo(
      organizationId,
      trx
    )

    return pendingMemberships.map((membership) => ({
      id: membership.user.id,
      email: membership.user.email ?? '',
      username: membership.user.username,
      system_role: membership.user.system_role,
      status: membership.user.status,
      avatar_url: membership.user.avatar_url,
      created_at: membership.user.created_at.toISO() ?? '',
    }))
  }

  async countPendingApprovalUsers(
    organizationId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<number> {
    return organizationPublicApi.countPendingMembers(organizationId, trx)
  }
}

export class InfraUserSkillReader implements UserSkillReader {
  async findActiveSkillById(
    skillId: DatabaseId,
    _trx?: TransactionClientContract
  ): Promise<UserActiveSkillInfo | null> {
    const [skill] = await skillPublicApi.findActiveByIds([skillId])

    if (!skill) {
      return null
    }

    return {
      id: skill.id,
      skill_name: skill.skill_name,
      category_code: skill.category_code,
    }
  }

  async listUserSkillDetails(
    userId: DatabaseId,
    _trx?: TransactionClientContract
  ): Promise<UserSkillDetail[]> {
    const userSkills = await skillPublicApi.findUserSkillsWithSkill(userId)

    return userSkills.map((userSkill) => ({
      id: userSkill.id,
      skill_id: userSkill.skill_id,
      level_code: userSkill.level_code,
      total_reviews: userSkill.total_reviews,
      avg_score: userSkill.avg_score,
      avg_percentage: userSkill.avg_percentage,
      last_reviewed_at: userSkill.last_reviewed_at,
      skill: {
        skill_name: userSkill.skill.skill_name,
        skill_code: userSkill.skill.skill_code,
        category_code: userSkill.skill.category_code,
        display_type: userSkill.skill.display_type,
      },
    }))
  }
}

export class InfraUserPermissionReader implements UserPermissionReader {
  async checkOrgPermission(
    userId: DatabaseId,
    organizationId: DatabaseId,
    permission: string,
    trx?: TransactionClientContract
  ): Promise<boolean> {
    const isSuperadmin = await this.isSystemSuperadmin(userId, trx)
    if (isSuperadmin) return true
    return organizationPublicApi.checkOrgPermission(userId, organizationId, permission, trx)
  }

  async isSystemSuperadmin(userId: DatabaseId, trx?: TransactionClientContract): Promise<boolean> {
    return userPublicApi.isSystemSuperadmin(userId, trx)
  }
}

export const DefaultUserDependencies: UserExternalDependencies = {
  organizationMembership: new InfraUserOrganizationMembershipReaderWriter(),
  skill: new InfraUserSkillReader(),
  permission: new InfraUserPermissionReader(),
}
