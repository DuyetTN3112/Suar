import { DefaultUserDependencies } from '../ports/user_external_dependencies_impl.js'

import { BaseQuery } from '#modules/users/actions/base_query'
import * as workHistoryQueries from '#modules/users/infra/repositories/read/user_work_history_queries'


/**
 * GetUserSkillsDTO
 */
export class GetUserSkillsDTO {
  declare user_id: string
  declare category_code?: string

  constructor(userId: string, categoryCode?: string) {
    this.user_id = userId
    this.category_code = categoryCode
  }
}

interface UserSkillResult {
  id: string
  skill_id: string
  skill_name: string
  skill_code: string
  category_name: string
  category_code: string
  level_code: string
  total_reviews: number
  avg_score: number | null
  avg_percentage: number | null
  last_reviewed_at: string | null
  evidence_count: number
  evidence_history: SkillEvidenceHistoryEntry[]
}

interface SkillEvidenceLink {
  evidence_id: string
  evidence_type: string
  url: string
  title: string | null
}

interface SkillEvidenceHistoryEntry {
  task_id: string
  task_title: string
  completed_at: string | null
  assigned_level_code: string | null
  reviewer_type: string | null
  comment: string | null
  evidence_links: SkillEvidenceLink[]
}

/**
 * GetUserSkillsQuery
 *
 * Fetches user's skills with proficiency levels and review stats.
 * Can filter by skill category.
 *
 * Uses caching for performance (5 min TTL)
 */
export default class GetUserSkillsQuery extends BaseQuery<GetUserSkillsDTO, UserSkillResult[]> {
  /**
   * Execute the query to get user skills
   */
  async handle(dto: GetUserSkillsDTO): Promise<UserSkillResult[]> {
    const cacheKey = this.generateCacheKey('users:skills', {
      userId: dto.user_id,
      category: dto.category_code ?? 'all',
    })

    return await this.executeWithCache(cacheKey, 300, async () => {
      const [userSkills, workHistoryRows] = await Promise.all([
        DefaultUserDependencies.skill.listUserSkillDetails(dto.user_id),
        workHistoryQueries.listRecentByUser(dto.user_id, 50),
      ])
      const evidenceBySkill = this.buildEvidenceHistoryBySkill(workHistoryRows)

      // Filter by category if specified (v3: category_code is inline on skills table)
      let filteredSkills = userSkills
      if (dto.category_code) {
        filteredSkills = userSkills.filter((us) => us.skill.category_code === dto.category_code)
      }

      // Map to result format (v3: level_code is inline on user_skills)
      return filteredSkills.map((us) => {
        const evidence = evidenceBySkill.get(us.skill_id) ?? []

        return {
          id: us.id,
          skill_id: us.skill_id,
          skill_name: us.skill.skill_name,
          skill_code: us.skill.skill_code,
          category_name: us.skill.category_code,
          category_code: us.skill.category_code,
          level_code: us.level_code,
          total_reviews: us.total_reviews,
          avg_score: us.avg_score,
          avg_percentage: us.avg_percentage,
          last_reviewed_at: us.last_reviewed_at?.toISO() ?? null,
          evidence_count: evidence.length,
          evidence_history: evidence.slice(0, 3),
        }
      })
    })
  }

  private buildEvidenceHistoryBySkill(
    rows: Awaited<ReturnType<typeof workHistoryQueries.listRecentByUser>>
  ): Map<string, SkillEvidenceHistoryEntry[]> {
    const evidenceBySkill = new Map<string, SkillEvidenceHistoryEntry[]>()

    for (const row of rows) {
      for (const skillScore of row.skill_scores) {
        const skillId = this.readString(skillScore, 'skill_id')
        if (!skillId) continue

        const current = evidenceBySkill.get(skillId) ?? []
        current.push({
          task_id: row.task_id,
          task_title: row.task_title,
          completed_at: row.completed_at?.toISO() ?? null,
          assigned_level_code: this.readString(skillScore, 'assigned_level_code'),
          reviewer_type: this.readString(skillScore, 'reviewer_type'),
          comment: this.readString(skillScore, 'comment'),
          evidence_links: row.evidence_links.map((link) => ({
            evidence_id: this.readString(link, 'evidence_id') ?? '',
            evidence_type: this.readString(link, 'evidence_type') ?? 'unknown',
            url: this.readString(link, 'url') ?? '',
            title: this.readString(link, 'title'),
          })).filter((link) => link.evidence_id || link.url),
        })
        evidenceBySkill.set(skillId, current)
      }
    }

    return evidenceBySkill
  }

  private readString(record: Record<string, unknown>, key: string): string | null {
    const value = record[key]
    return typeof value === 'string' && value.trim().length > 0 ? value : null
  }
}
