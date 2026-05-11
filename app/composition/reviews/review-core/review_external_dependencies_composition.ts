import {
  organizationMembershipRepository,
  organizationReader,
} from '#composition/organizations/persistence/organization_persistence_composition'
import { skillApplication as skillPublicApi } from '#composition/skills/skill-application/skills_application_composition'
import { userPublicApi } from '#composition/users/user-application/user_application_composition'
import type {
  LifetimePerformanceStatsPayload,
  PersistedSkillScoreResult,
  ReviewSkillInfo,
  ReviewSkillReader,
  ReviewedSkillScorePayload,
  ReviewExternalDependencies,
  ReviewOrganizationReader,
  ReviewUserAccountInfo,
  ReviewUserCredibilityData,
  ReviewModeratorIdentityReader,
  ReviewActorAccessReader,
  ReviewUserReaderWriter,
  ReviewUserSkillWriter,
  ReviewUserTrustData,
  SpiderChartSkillPayload,
} from '#modules/reviews/actions/ports/outbound/review_external_dependencies'
import type { ReviewTransaction } from '#modules/reviews/actions/ports/outbound/review_transaction'
import { toLucidReviewTransaction } from '#modules/reviews/infra/adapters/review-core/lucid_review_transaction_runner'

export class InfraReviewOrganizationReader implements ReviewOrganizationReader {
  async listOrganizationIdsByUser(userId: string, trx?: ReviewTransaction): Promise<string[]> {
    const memberships = await organizationMembershipRepository.listByUser(
      userId,
      toLucidReviewTransaction(trx)
    )
    return memberships.map((membership) => membership.organization_id)
  }

  async hasAnyActivePartnerByIds(
    organizationIds: string[],
    trx?: ReviewTransaction
  ): Promise<boolean> {
    return organizationReader.hasAnyActivePartnerByIds(
      organizationIds,
      toLucidReviewTransaction(trx)
    )
  }

  isApprovedMember(userId: string, organizationId: string): Promise<boolean> {
    return organizationMembershipRepository.isApprovedMember(userId, organizationId)
  }
}

export class InfraReviewUserReaderWriter implements ReviewUserReaderWriter {
  async findAccountInfo(
    userId: string,
    trx?: ReviewTransaction
  ): Promise<ReviewUserAccountInfo | null> {
    return userPublicApi.findReviewAccountInfo(userId, toLucidReviewTransaction(trx))
  }

  async mergeTrustData(
    userId: string,
    trustData: Partial<ReviewUserTrustData>,
    trx?: ReviewTransaction
  ): Promise<void> {
    await userPublicApi.mergeTrustData(userId, trustData, toLucidReviewTransaction(trx))
  }

  async updateCredibilityData(
    userId: string,
    credibilityData: ReviewUserCredibilityData,
    trx?: ReviewTransaction
  ): Promise<void> {
    await userPublicApi.updateCredibilityData(
      userId,
      credibilityData,
      toLucidReviewTransaction(trx)
    )
  }

  async upsertLifetimePerformanceStats(
    userId: string,
    payload: LifetimePerformanceStatsPayload,
    trx?: ReviewTransaction
  ): Promise<void> {
    await userPublicApi.upsertLifetimePerformanceStats(
      userId,
      payload,
      toLucidReviewTransaction(trx)
    )
  }

  async refreshProfileAggregates(
    userId: string,
    execCtx: Parameters<ReviewUserReaderWriter['refreshProfileAggregates']>[1],
    options: Parameters<ReviewUserReaderWriter['refreshProfileAggregates']>[2]
  ): Promise<void> {
    await userPublicApi.refreshProfileAggregates({ userId, fullRebuild: false }, execCtx, {
      ...options,
      trx: toLucidReviewTransaction(options.trx),
    })
  }
}

export class InfraReviewModeratorIdentityReader implements ReviewModeratorIdentityReader {
  async findByIds(
    userIds: string[],
    trx?: ReviewTransaction
  ): Promise<Awaited<ReturnType<ReviewModeratorIdentityReader['findByIds']>>> {
    const facts = await userPublicApi.findModerationIdentityFactsV1(
      userIds,
      toLucidReviewTransaction(trx)
    )
    return facts.map((fact) => ({
      id: fact.id,
      username: fact.username,
      email: fact.email,
    }))
  }

  async findIdsByUsername(username: string): Promise<string[]> {
    return userPublicApi.findModerationIdentityIdsByUsername(username)
  }
}

export class InfraReviewActorAccessReader implements ReviewActorAccessReader {
  async findActorAccess(
    userId: string,
    trx?: ReviewTransaction
  ): Promise<Awaited<ReturnType<ReviewActorAccessReader['findActorAccess']>>> {
    const actor = await userPublicApi.findActorIdentityV1(userId, toLucidReviewTransaction(trx))
    return actor ? { systemRole: actor.systemRole } : null
  }

  async findOrganizationMembership(
    userId: string,
    organizationId: string,
    trx?: ReviewTransaction
  ): Promise<Awaited<ReturnType<ReviewActorAccessReader['findOrganizationMembership']>>> {
    const membership = await organizationMembershipRepository.find(
      organizationId,
      userId,
      toLucidReviewTransaction(trx)
    )
    if (!membership) {
      return null
    }

    return {
      role: membership.org_role,
      status: membership.status,
    }
  }
}

export class InfraReviewUserSkillWriter implements ReviewUserSkillWriter {
  async upsertReviewedSkillScore(
    userId: string,
    skillId: string,
    payload: ReviewedSkillScorePayload,
    trx?: ReviewTransaction
  ): Promise<PersistedSkillScoreResult> {
    return userPublicApi.upsertReviewedSkillScore(
      userId,
      skillId,
      payload,
      toLucidReviewTransaction(trx)
    )
  }

  async upsertSpiderChartSkillData(
    userId: string,
    skillId: string,
    payload: SpiderChartSkillPayload,
    trx?: ReviewTransaction
  ): Promise<void> {
    await userPublicApi.upsertSpiderChartSkillData(
      userId,
      skillId,
      payload,
      toLucidReviewTransaction(trx)
    )
  }
}

export class InfraReviewSkillReader implements ReviewSkillReader {
  async listActiveSkills() {
    const skills = await skillPublicApi.listActive()
    return skills.map((skill) => ({
      id: skill.id,
      skill_name: skill.skill_name,
      category_code: skill.category_code,
    }))
  }

  async listSpiderChartSkillIds(_trx?: ReviewTransaction): Promise<{ id: string }[]> {
    return skillPublicApi.getSpiderChartSkillIds()
  }

  async resolveProficiencyLevelId(
    levelCode: string,
    trx?: ReviewTransaction
  ): Promise<string | null> {
    const level = await skillPublicApi.mapProficiencyCodeToLevel(
      levelCode,
      toLucidReviewTransaction(trx)
    )
    return level?.id ?? null
  }

  async findSkillsByIds(skillIds: string[], trx?: ReviewTransaction): Promise<ReviewSkillInfo[]> {
    const skills = await skillPublicApi.findIdentityFactsV1(skillIds, toLucidReviewTransaction(trx))

    return skills.map((skill) => ({
      id: skill.id,
      name: skill.name,
      categoryCode: skill.categoryCode,
      is_active: skill.isActive,
    }))
  }
}

export const reviewExternalDependencies: ReviewExternalDependencies = {
  organization: new InfraReviewOrganizationReader(),
  user: new InfraReviewUserReaderWriter(),
  moderatorIdentity: new InfraReviewModeratorIdentityReader(),
  actorAccess: new InfraReviewActorAccessReader(),
  userSkill: new InfraReviewUserSkillWriter(),
  skill: new InfraReviewSkillReader(),
}
