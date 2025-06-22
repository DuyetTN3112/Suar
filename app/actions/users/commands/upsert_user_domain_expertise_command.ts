import { DateTime } from 'luxon'
import { BaseCommand } from '#actions/shared/base_command'
import type { DatabaseId } from '#types/database'
import UserDomainExpertiseRepository from '#infra/users/repositories/user_domain_expertise_repository'
import UserAnalyticsRepository from '#infra/users/repositories/user_analytics_repository'

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
  private incrementCounter(counter: Record<string, number>, key: string | null): void {
    if (!key) return
    counter[key] = (counter[key] ?? 0) + 1
  }

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

      const techStackFrequency: Record<string, number> = {}
      const domainFrequency: Record<string, number> = {}
      const problemCategoryFrequency: Record<string, number> = {}
      const skillTotals: Record<string, { count: number; weightedSum: number }> = {}

      for (const row of historyRows) {
        const techStack = this.toStringArray(row.tech_stack)
        const domainTags = this.toStringArray(row.domain_tags)

        for (const tech of techStack) {
          this.incrementCounter(techStackFrequency, tech)
        }

        for (const domainTag of domainTags) {
          this.incrementCounter(domainFrequency, domainTag)
        }

        this.incrementCounter(domainFrequency, row.business_domain)
        this.incrementCounter(problemCategoryFrequency, row.problem_category)

        for (const skill of this.toObjectArray(row.skill_scores)) {
          const skillName = typeof skill.skill_name === 'string' ? skill.skill_name : null
          if (!skillName) continue

          const current = skillTotals[skillName] ?? { count: 0, weightedSum: 0 }
          current.count += 1

          const assignedLevelCode =
            typeof skill.assigned_level_code === 'string' ? skill.assigned_level_code : 'beginner'

          const weight =
            assignedLevelCode === 'expert'
              ? 4
              : assignedLevelCode === 'advanced'
                ? 3
                : assignedLevelCode === 'intermediate'
                  ? 2
                  : 1

          current.weightedSum += weight
          skillTotals[skillName] = current
        }
      }

      const topSkills = Object.entries(skillTotals)
        .map(([skillName, values]) => ({
          skill_name: skillName,
          review_mentions: values.count,
          weighted_score: Math.round((values.weightedSum / Math.max(values.count, 1)) * 100) / 100,
        }))
        .sort((a, b) => {
          if (b.weighted_score === a.weighted_score) {
            return b.review_mentions - a.review_mentions
          }
          return b.weighted_score - a.weighted_score
        })
        .slice(0, 12)

      const payload = {
        user_id: dto.userId,
        tech_stack_frequency: techStackFrequency,
        domain_frequency: domainFrequency,
        problem_category_frequency: problemCategoryFrequency,
        top_skills: topSkills,
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
          total_domains: Object.keys(domainFrequency).length,
          total_tech_stack: Object.keys(techStackFrequency).length,
          top_skills_count: topSkills.length,
        }
      )

      return {
        userId: dto.userId,
        expertiseId,
        topSkillsCount: topSkills.length,
      }
    })
  }
}
