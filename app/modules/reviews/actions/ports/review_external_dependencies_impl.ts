import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import type {
  CompletedAssignmentInfo,
  LifetimePerformanceStatsPayload,
  PersistedSkillScoreResult,
  ReviewSkillInfo,
  ReviewSkillReader,
  ReviewedSkillScorePayload,
  ReviewExternalDependencies,
  ReviewOrganizationReader,
  ReviewTaskAssignmentReader,
  ReviewUserAccountInfo,
  ReviewUserReaderWriter,
  ReviewUserSkillWriter,
  SpiderChartSkillPayload,
} from './review_external_dependencies.js'

import { organizationPublicApi } from '#modules/organizations/public_contracts/organization_public_api'
import { skillPublicApi } from '#modules/skills/public_contracts/skill_public_api'
import { taskPublicApi } from '#modules/tasks/public_contracts/task_public_api'
import { userPublicApi } from '#modules/users/public_contracts/user_public_api'
import type { UserCredibilityData, UserTrustData } from '#modules/users/types/user_profile_data'

export class InfraReviewTaskAssignmentReader implements ReviewTaskAssignmentReader {
  async findCompletedAssignment(
    assignmentId: string,
    trx?: TransactionClientContract
  ): Promise<CompletedAssignmentInfo | null> {
    const assignment = await taskPublicApi.findCompletedAssignment(assignmentId, trx)
    if (!assignment) {
      return null
    }

    return {
      id: assignment.id,
      task_id: assignment.task_id,
      assignee_id: assignment.assignee_id,
    }
  }
}

export class InfraReviewOrganizationReader implements ReviewOrganizationReader {
  async listOrganizationIdsByUser(
    userId: string,
    trx?: TransactionClientContract
  ): Promise<string[]> {
    const memberships = await organizationPublicApi.listMembershipsByUser(userId, trx)
    return memberships.map((membership) => membership.organization_id)
  }

  async hasAnyActivePartnerByIds(
    organizationIds: string[],
    trx?: TransactionClientContract
  ): Promise<boolean> {
    return organizationPublicApi.hasAnyActivePartnerByIds(organizationIds, trx)
  }
}

export class InfraReviewUserReaderWriter implements ReviewUserReaderWriter {
  async findAccountInfo(
    userId: string,
    trx?: TransactionClientContract
  ): Promise<ReviewUserAccountInfo | null> {
    return userPublicApi.findReviewAccountInfo(userId, trx)
  }

  async mergeTrustData(
    userId: string,
    trustData: Partial<UserTrustData>,
    trx?: TransactionClientContract
  ): Promise<void> {
    await userPublicApi.mergeTrustData(userId, trustData, trx)
  }

  async updateCredibilityData(
    userId: string,
    credibilityData: UserCredibilityData,
    trx?: TransactionClientContract
  ): Promise<void> {
    await userPublicApi.updateCredibilityData(userId, credibilityData, trx)
  }

  async upsertLifetimePerformanceStats(
    userId: string,
    payload: LifetimePerformanceStatsPayload,
    trx?: TransactionClientContract
  ): Promise<void> {
    await userPublicApi.upsertLifetimePerformanceStats(userId, payload, trx)
  }
}

export class InfraReviewUserSkillWriter implements ReviewUserSkillWriter {
  async upsertReviewedSkillScore(
    userId: string,
    skillId: string,
    payload: ReviewedSkillScorePayload,
    trx?: TransactionClientContract
  ): Promise<PersistedSkillScoreResult> {
    return userPublicApi.upsertReviewedSkillScore(userId, skillId, payload, trx)
  }

  async upsertSpiderChartSkillData(
    userId: string,
    skillId: string,
    payload: SpiderChartSkillPayload,
    trx?: TransactionClientContract
  ): Promise<void> {
    await userPublicApi.upsertSpiderChartSkillData(userId, skillId, payload, trx)
  }
}

export class InfraReviewSkillReader implements ReviewSkillReader {
  async listSpiderChartSkillIds(_trx?: TransactionClientContract): Promise<{ id: string }[]> {
    return skillPublicApi.getSpiderChartSkillIds()
  }

  async findSkillsByIds(
    skillIds: string[],
    _trx?: TransactionClientContract
  ): Promise<ReviewSkillInfo[]> {
    const skills = await skillPublicApi.findByIds(skillIds)

    return skills.map((skill) => ({
      id: skill.id,
      is_active: skill.is_active,
    }))
  }
}

export const DefaultReviewDependencies: ReviewExternalDependencies = {
  taskAssignment: new InfraReviewTaskAssignmentReader(),
  organization: new InfraReviewOrganizationReader(),
  user: new InfraReviewUserReaderWriter(),
  userSkill: new InfraReviewUserSkillWriter(),
  skill: new InfraReviewSkillReader(),
}
