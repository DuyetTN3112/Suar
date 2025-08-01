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

import { organizationPublicApi } from '#actions/organizations/public_api'
import { skillPublicApi } from '#actions/skills/public_api'
import { taskPublicApi } from '#actions/tasks/public_api'
import { userPublicApi } from '#actions/users/public_api'
import type { DatabaseId, UserCredibilityData, UserTrustData } from '#types/database'

export class InfraReviewTaskAssignmentReader implements ReviewTaskAssignmentReader {
  async findCompletedAssignment(
    assignmentId: DatabaseId,
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
    userId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<DatabaseId[]> {
    const memberships = await organizationPublicApi.listMembershipsByUser(userId, trx)
    return memberships.map((membership) => membership.organization_id)
  }

  async hasAnyActivePartnerByIds(
    organizationIds: DatabaseId[],
    trx?: TransactionClientContract
  ): Promise<boolean> {
    return organizationPublicApi.hasAnyActivePartnerByIds(organizationIds, trx)
  }
}

export class InfraReviewUserReaderWriter implements ReviewUserReaderWriter {
  async findAccountInfo(
    userId: DatabaseId,
    trx?: TransactionClientContract
  ): Promise<ReviewUserAccountInfo | null> {
    return userPublicApi.findReviewAccountInfo(userId, trx)
  }

  async mergeTrustData(
    userId: DatabaseId,
    trustData: Partial<UserTrustData>,
    trx?: TransactionClientContract
  ): Promise<void> {
    await userPublicApi.mergeTrustData(userId, trustData, trx)
  }

  async updateCredibilityData(
    userId: DatabaseId,
    credibilityData: UserCredibilityData,
    trx?: TransactionClientContract
  ): Promise<void> {
    await userPublicApi.updateCredibilityData(userId, credibilityData, trx)
  }

  async upsertLifetimePerformanceStats(
    userId: DatabaseId,
    payload: LifetimePerformanceStatsPayload,
    trx?: TransactionClientContract
  ): Promise<void> {
    await userPublicApi.upsertLifetimePerformanceStats(userId, payload, trx)
  }
}

export class InfraReviewUserSkillWriter implements ReviewUserSkillWriter {
  async upsertReviewedSkillScore(
    userId: DatabaseId,
    skillId: DatabaseId,
    payload: ReviewedSkillScorePayload,
    trx?: TransactionClientContract
  ): Promise<PersistedSkillScoreResult> {
    return userPublicApi.upsertReviewedSkillScore(userId, skillId, payload, trx)
  }

  async upsertSpiderChartSkillData(
    userId: DatabaseId,
    skillId: DatabaseId,
    payload: SpiderChartSkillPayload,
    trx?: TransactionClientContract
  ): Promise<void> {
    await userPublicApi.upsertSpiderChartSkillData(userId, skillId, payload, trx)
  }
}

export class InfraReviewSkillReader implements ReviewSkillReader {
  async listSpiderChartSkillIds(_trx?: TransactionClientContract): Promise<{ id: DatabaseId }[]> {
    return skillPublicApi.getSpiderChartSkillIds()
  }

  async findSkillsByIds(
    skillIds: DatabaseId[],
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
