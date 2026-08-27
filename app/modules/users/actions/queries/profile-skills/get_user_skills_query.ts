import { DateTime } from 'luxon'

import { BaseQuery } from '#modules/users/actions/base_query'
import type { UserSkillReader } from '#modules/users/actions/ports/outbound/user_external_dependencies'
import type {
  PersistedUserWorkHistory,
  UserProfileRepository,
} from '#modules/users/actions/ports/outbound/user_profile_repository'
import type { UserActionContext } from '#modules/users/actions/user_action_context'


/**
 * GetUserSkillsDTO
 */
export class GetUserSkillsDTO {
  declare user_id: string
  declare category_code?: string

  constructor(userId: string, categoryCode?: string) {
    this.user_id = userId
    if (categoryCode !== undefined) {
      this.category_code = categoryCode
    }
  }
}

interface UserSkillResult {
  id: string
  skill_id: string
  skill_name: string
  skill_code: string
  category_name: string
  category_code: string
  verified_public_proficiency_code: string
  source: 'imported' | 'reviewed'
  total_reviews: number
  avg_score: number | null
  avg_percentage: number | null
  confidence_signal: 'low' | 'medium' | 'high' | null
  freshness_state: 'unreviewed' | 'fresh' | 'stale'
  governance_state: 'unreviewed' | 'verified' | 'under_dispute'
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
  assigned_public_proficiency_code: string | null
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
 * Raw evidence and reviewer comments are intentionally not cached. A future
 * cache must use an allowlisted, visibility-scoped projection.
 */
export default class GetUserSkillsQuery extends BaseQuery<GetUserSkillsDTO, UserSkillResult[]> {
  constructor(
    execCtx: UserActionContext,
    private readonly skillReader: UserSkillReader,
    private readonly profiles: UserProfileRepository
  ) {
    super(execCtx)
  }

  /**
   * Execute the query to get user skills
   */
  async handle(dto: GetUserSkillsDTO): Promise<UserSkillResult[]> {
    const viewerScope = this.execCtx.userId === dto.user_id ? 'self' : 'public'
    const [userSkills, workHistoryRows] = await Promise.all([
      this.skillReader.listUserSkillDetails(dto.user_id),
      this.profiles.listRecentWorkHistory(
        dto.user_id,
        50,
        { publicOnly: viewerScope === 'public' }
      ),
    ])
    const evidenceBySkill = this.buildEvidenceHistoryBySkill(workHistoryRows)

    // Filter by category if specified (v3: category_code is inline on skills table)
    let filteredSkills = userSkills
    if (dto.category_code) {
      filteredSkills = userSkills.filter((us) => us.skill.category_code === dto.category_code)
    }

    // Map to result format (v3: verified_public_proficiency_code is inline on user_skills)
    return filteredSkills.map((us) => {
      const evidence = evidenceBySkill.get(us.skill_id) ?? []

      return {
        id: us.id,
        skill_id: us.skill_id,
        skill_name: us.skill.skill_name,
        skill_code: us.skill.skill_code,
        category_name: us.skill.category_code,
        category_code: us.skill.category_code,
        verified_public_proficiency_code: us.verified_public_proficiency_code,
        source: us.source,
        total_reviews: us.total_reviews,
        avg_score: us.avg_score,
        avg_percentage: us.avg_percentage,
        confidence_signal: us.confidence_signal,
        freshness_state: this.buildFreshnessState(us.last_reviewed_at),
        governance_state: this.buildGovernanceState(us.has_active_dispute, us.total_reviews),
        last_reviewed_at: us.last_reviewed_at?.toISO() ?? null,
        evidence_count: evidence.length,
        evidence_history: evidence.slice(0, 3),
      }
    })
  }

  private buildEvidenceHistoryBySkill(
    rows: PersistedUserWorkHistory[]
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
          assigned_public_proficiency_code: this.readString(
            skillScore,
            'assigned_public_proficiency_code'
          ),
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

  private buildFreshnessState(
    lastReviewedAt: DateTime | null
  ): 'unreviewed' | 'fresh' | 'stale' {
    if (!lastReviewedAt) {
      return 'unreviewed'
    }

    const ageInDays = Math.max(0, Math.floor(DateTime.now().diff(lastReviewedAt, 'days').days))
    return ageInDays <= 90 ? 'fresh' : 'stale'
  }

  private buildGovernanceState(
    hasActiveDispute: boolean,
    totalReviews: number
  ): 'unreviewed' | 'verified' | 'under_dispute' {
    if (hasActiveDispute) {
      return 'under_dispute'
    }
    if (totalReviews > 0) {
      return 'verified'
    }
    return 'unreviewed'
  }
}
