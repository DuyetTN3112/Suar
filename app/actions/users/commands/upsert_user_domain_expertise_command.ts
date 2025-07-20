import { DateTime } from 'luxon'
import { BaseCommand } from '#actions/shared/base_command'
import type { DatabaseId } from '#types/database'
import UserDomainExpertiseRepository from '#infra/users/repositories/user_domain_expertise_repository'
import UserAnalyticsRepository from '#infra/users/repositories/user_analytics_repository'
import { calculateDomainExpertiseMetrics } from '#domain/users/profile_aggregate_rules'

export interface UpsertUserDomainExpertiseDTO {
  userId: DatabaseId
}

export interface UpsertUserDomainExpertiseResult {
  userId: DatabaseId
  expertiseId: DatabaseId
  topSkillsCount: number
}

type WorkHistoryRow = {
  tech_stack: unknown
  domain_tags: unknown
  business_domain: string | null
  problem_category: string | null
  skill_scores: unknown
}

export default class UpsertUserDomainExpertiseCommand extends BaseCommand<
  UpsertUserDomainExpertiseDTO,
  UpsertUserDomainExpertiseResult
> {
  private toStringArray(value: unknown): string[] {
    if (Array.isArray(value)) {
      return value.filter((item): item is string => typeof item === 'string')
    }

    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value) as unknown
        return Array.isArray(parsed)
          ? parsed.filter((item): item is string => typeof item === 'string')
          : []
      } catch {
        return []
      }
    }

    return []
  }

  private toObjectArray(value: unknown): Array<Record<string, unknown>> {
    if (Array.isArray(value)) {
      return value.filter(
        (item): item is Record<string, unknown> => typeof item === 'object' && item !== null
      )
    }

    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value) as unknown
        return Array.isArray(parsed)
          ? parsed.filter(
              (item): item is Record<string, unknown> => typeof item === 'object' && item !== null
            )
          : []
      } catch {
        return []
      }
    }

    return []
  }

  async handle(dto: UpsertUserDomainExpertiseDTO): Promise<UpsertUserDomainExpertiseResult> {
    return await this.executeInTransaction(async (trx) => {
      const historyRows = (await UserAnalyticsRepository.listDomainExpertiseRows(
        dto.userId,
        trx
      )) as WorkHistoryRow[]
      const metrics = calculateDomainExpertiseMetrics(
        historyRows.map((row) => ({
          techStack: this.toStringArray(row.tech_stack),
          domainTags: this.toStringArray(row.domain_tags),
          businessDomain: row.business_domain,
          problemCategory: row.problem_category,
          skillScores: this.toObjectArray(row.skill_scores).map((skill) => ({
            skillName: typeof skill.skill_name === 'string' ? skill.skill_name : null,
            assignedLevelCode:
              typeof skill.assigned_level_code === 'string' ? skill.assigned_level_code : null,
          })),
        }))
      )

      const payload = {
        user_id: dto.userId,
        tech_stack_frequency: metrics.techStackFrequency,
        domain_frequency: metrics.domainFrequency,
        problem_category_frequency: metrics.problemCategoryFrequency,
        top_skills: metrics.topSkills,
        calculated_at: DateTime.now(),
      }

      const existing = await UserDomainExpertiseRepository.findByUser(dto.userId, trx)

      let expertiseId: DatabaseId
      if (existing) {
        existing.merge(payload)
        await UserDomainExpertiseRepository.save(existing, trx)
        expertiseId = existing.id
      } else {
        const created = await UserDomainExpertiseRepository.create(payload, trx)
        expertiseId = created.id
      }

      await this.logAudit(
        'upsert_user_domain_expertise',
        'user_domain_expertise',
        dto.userId,
        null,
        {
          expertise_id: expertiseId,
          total_domains: Object.keys(metrics.domainFrequency).length,
          total_tech_stack: Object.keys(metrics.techStackFrequency).length,
          top_skills_count: metrics.topSkills.length,
        }
      )

      return {
        userId: dto.userId,
        expertiseId,
        topSkillsCount: metrics.topSkills.length,
      }
    })
  }
}
