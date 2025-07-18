import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import { OrganizationUserStatus } from '#constants/organization_constants'
import OrganizationUserRepository from '#infra/organizations/repositories/organization_user_repository'
import SkillRepository from '#infra/skills/repositories/skill_repository'
import * as PermissionService from '#services/permission_service'
import type { DatabaseId } from '#types/database'

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

export class InfraUserOrganizationMembershipReaderWriter
  implements UserOrganizationMembershipReaderWriter
{
  async findMembershipStatus(
    userId: DatabaseId,
    organizationId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<UserOrganizationMembershipInfo | null> {
    const membership = await OrganizationUserRepository.findMembership(organizationId, userId, trx)
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
    await OrganizationUserRepository.updateStatus(
      organizationId,
      userId,
      OrganizationUserStatus.APPROVED,
      trx
    )
  }

  async listPendingApprovalUsers(
    organizationId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<PendingApprovalUser[]> {
    const pendingMemberships =
      await OrganizationUserRepository.findPendingMembershipsWithUserInfo(organizationId, trx)

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
    return OrganizationUserRepository.countPendingMembers(organizationId, trx)
  }
}

export class InfraUserSkillReader implements UserSkillReader {
  async findActiveSkillById(
    skillId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<UserActiveSkillInfo | null> {
    const [skill] = await SkillRepository.findActiveByIds([skillId], trx)

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
    trx?: TransactionClientContract
  ): Promise<UserSkillDetail[]> {
    const userSkills = await SkillRepository.findUserSkillsWithSkill(userId, trx)

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
    return PermissionService.checkOrgPermission(userId, organizationId, permission, trx)
  }

  async isSystemSuperadmin(
    userId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<boolean> {
    return PermissionService.isSystemSuperadmin(userId, trx)
  }
}

export const DefaultUserDependencies: UserExternalDependencies = {
  organizationMembership: new InfraUserOrganizationMembershipReaderWriter(),
  skill: new InfraUserSkillReader(),
  permission: new InfraUserPermissionReader(),
}
