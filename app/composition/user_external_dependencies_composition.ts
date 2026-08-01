import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import { UserSkillCatalogAdapter } from '#composition/adapters/user_skill_catalog_adapter'
import { organizationRouteAccessReader } from '#composition/organization_access_read_composition'
import {
  organizationMembershipRepository,
  organizationReader,
} from '#composition/organization_persistence_composition'
import { skillApplication as skillPublicApi } from '#composition/skills_application_composition'
import { userAccountRepository } from '#composition/user_persistence_composition'
import PersistedDataIntegrityException from '#modules/errors/public_contracts/persisted_data_integrity_exception'
import { OrganizationUserStatus } from '#modules/organizations/access/public_contracts/organization_constants'
import ReviewMetricsRepository from '#modules/reviews/infra/repositories/read/review_metrics_repository'
import type {
  PendingApprovalUser,
  UserExternalDependencies,
  UserOrganizationMembershipInfo,
  UserOrganizationMembershipReaderWriter,
  UserOrganizationSummary,
  UserPermissionReader,
  UserSkillDetail,
  UserSkillReader,
} from '#modules/users/actions/ports/outbound/user_external_dependencies'
import type { UserSkillCatalog } from '#modules/users/actions/ports/outbound/user_skill_catalog'
import { assertUserSkillCatalogFactsComplete } from '#modules/users/infra/adapters/user_skill_catalog_integrity'
import UserSkillRepository from '#modules/users/infra/repositories/user_skill_repository'

interface ConfidenceSignalRow {
  skill_id: string
  confidence: UserSkillDetail['confidence_signal']
}

interface ActiveDisputeSkillRow {
  skill_id: string
}

/** Composition-owned bridge for the two review facts needed by user skill projections. */
class ReviewMetricsReaderAdapter {
  listLatestConfidenceSignalsBySkill(
    userId: string,
    trx?: TransactionClientContract
  ): ReturnType<typeof ReviewMetricsRepository.listLatestConfidenceSignalsBySkill> {
    return ReviewMetricsRepository.listLatestConfidenceSignalsBySkill(userId, trx)
  }

  listActiveDisputedSkillIdsByReviewee(
    userId: string,
    trx?: TransactionClientContract
  ): ReturnType<typeof ReviewMetricsRepository.listActiveDisputedSkillIdsByReviewee> {
    return ReviewMetricsRepository.listActiveDisputedSkillIdsByReviewee(userId, trx)
  }
}

export class InfraUserOrganizationMembershipReaderWriter implements UserOrganizationMembershipReaderWriter {
  async findOrganizationSummary(
    organizationId: string,
    trx?: TransactionClientContract
  ): Promise<UserOrganizationSummary | null> {
    const organization = await organizationReader.findById(organizationId, trx)
    if (!organization || organization.deleted_at) {
      return null
    }

    return {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      logo: organization.logo,
    }
  }

  async listMemberUserIds(
    organizationId: string,
    status?: string | null,
    trx?: TransactionClientContract
  ): Promise<string[]> {
    return organizationMembershipRepository.listMemberUserIds(organizationId, status, trx)
  }

  async findMembershipStatus(
    userId: string,
    organizationId: string,
    trx?: TransactionClientContract
  ): Promise<UserOrganizationMembershipInfo | null> {
    const membership = await organizationMembershipRepository.find(organizationId, userId, trx)
    if (!membership) {
      return null
    }

    return {
      status: membership.status,
    }
  }

  async approveMembership(
    userId: string,
    organizationId: string,
    trx?: TransactionClientContract
  ): Promise<void> {
    await organizationMembershipRepository.updateStatus(
      organizationId,
      userId,
      OrganizationUserStatus.APPROVED,
      trx
    )
  }

  async listPendingApprovalUsers(
    organizationId: string,
    trx?: TransactionClientContract
  ): Promise<PendingApprovalUser[]> {
    const pendingMemberships =
      await organizationMembershipRepository.findPendingMembershipsWithUserInfo(organizationId, trx)

    return pendingMemberships.map((membership) => ({
      id: membership.user.id,
      email: membership.user.email ?? '',
      username: membership.user.username,
      system_role: membership.user.system_role,
      status: membership.user.status,
      avatar_url: membership.user.avatar_url,
      created_at: membership.user.created_at.toISOString(),
    }))
  }

  async countPendingApprovalUsers(
    organizationId: string,
    trx?: TransactionClientContract
  ): Promise<number> {
    return organizationMembershipRepository.countPendingMembers(organizationId, trx)
  }
}

export class InfraUserSkillReader implements UserSkillReader {
  constructor(private readonly catalog: UserSkillCatalog) {}

  async resolveProficiencyLevelId(
    levelCode: string,
    trx?: TransactionClientContract
  ): Promise<string | null> {
    const level = await skillPublicApi.mapProficiencyCodeToLevel(levelCode, trx)
    return level?.id ?? null
  }

  async listUserSkillDetails(
    userId: string,
    trx?: TransactionClientContract
  ): Promise<UserSkillDetail[]> {
    const userSkills = await UserSkillRepository.listModelsByUser(userId, trx)
    const skillIds = userSkills.map((userSkill) => userSkill.skill_id)
    let rawConfidenceRows: unknown
    let rawActiveDisputeRows: unknown
    let skillFacts: Awaited<ReturnType<UserSkillCatalog['findProfileFactsByIds']>>

    if (trx) {
      skillFacts = await this.catalog.findProfileFactsByIds(skillIds, trx)
      rawConfidenceRows = await reviewMetricsReader.listLatestConfidenceSignalsBySkill(userId, trx)
      rawActiveDisputeRows = await reviewMetricsReader.listActiveDisputedSkillIdsByReviewee(
        userId,
        trx
      )
    } else {
      ;[skillFacts, rawConfidenceRows, rawActiveDisputeRows] = await Promise.all([
        this.catalog.findProfileFactsByIds(skillIds),
        reviewMetricsReader.listLatestConfidenceSignalsBySkill(userId),
        reviewMetricsReader.listActiveDisputedSkillIdsByReviewee(userId),
      ])
    }

    const confidenceRows = rawConfidenceRows as ConfidenceSignalRow[]
    const activeDisputeRows = rawActiveDisputeRows as ActiveDisputeSkillRow[]
    const confidenceBySkill = new Map(confidenceRows.map((row) => [row.skill_id, row.confidence]))
    const disputedSkillIds = new Set(activeDisputeRows.map((row) => row.skill_id))
    const skillFactById = new Map(skillFacts.map((fact) => [fact.id, fact]))
    assertUserSkillCatalogFactsComplete(
      userId,
      skillIds,
      skillFacts.map((fact) => fact.id)
    )

    return userSkills.map((userSkill) => {
      const skill = skillFactById.get(userSkill.skill_id)
      if (!skill) {
        throw new PersistedDataIntegrityException(
          'Persisted user skill lost its catalog fact during profile assembly',
          {
            table: 'user_skills',
            relation: 'skills',
            record_id: userSkill.id,
            reason: 'catalog_fact_changed_during_read',
          }
        )
      }

      return {
        id: userSkill.id,
        skill_id: userSkill.skill_id,
        verified_public_proficiency_code: userSkill.verified_public_proficiency_code,
        source: userSkill.source,
        total_reviews: userSkill.total_reviews,
        avg_score: userSkill.avg_score,
        avg_percentage: userSkill.avg_percentage,
        last_reviewed_at: userSkill.last_reviewed_at,
        confidence_signal: confidenceBySkill.get(userSkill.skill_id) ?? null,
        has_active_dispute: disputedSkillIds.has(userSkill.skill_id),
        skill: {
          skill_name: skill.skill_name,
          skill_code: skill.skill_code,
          category_code: skill.category_code,
          display_type: skill.display_type,
        },
      }
    })
  }
}

export class InfraUserPermissionReader implements UserPermissionReader {
  async checkOrgPermission(
    userId: string,
    organizationId: string,
    permission: string,
    trx?: TransactionClientContract
  ): Promise<boolean> {
    const isSuperadmin = await this.isSystemSuperadmin(userId, trx)
    if (isSuperadmin) return true
    return organizationRouteAccessReader.checkPermission(userId, organizationId, permission, trx)
  }

  async isSystemSuperadmin(userId: string, trx?: TransactionClientContract): Promise<boolean> {
    return userAccountRepository.isSuperadmin(userId, trx)
  }
}

const defaultUserSkillCatalog = new UserSkillCatalogAdapter()
const reviewMetricsReader = new ReviewMetricsReaderAdapter()

export const userExternalDependencies: UserExternalDependencies = {
  organizationMembership: new InfraUserOrganizationMembershipReaderWriter(),
  skill: new InfraUserSkillReader(defaultUserSkillCatalog),
  skillCatalog: defaultUserSkillCatalog,
  permission: new InfraUserPermissionReader(),
}
