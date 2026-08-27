import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import { getCanonicalProficiencyLevelLabel } from '#modules/skills/public_contracts/rubric-and-proficiency/proficiency_framework'
import { BaseQuery } from '#modules/users/actions/base_query'
import type { FeaturedReviewSkillReader } from '#modules/users/actions/ports/outbound/featured_review_skill_reader'
import type {
  TopReviewedSkillRow,
  UserProfileRepository,
} from '#modules/users/actions/ports/outbound/user_profile_repository'
import type { UserActionContext } from '#modules/users/actions/user_action_context'

/**
 * GetFeaturedReviewsDTO
 */
export class GetFeaturedReviewsDTO {
  declare user_id: string
  declare limit: number

  constructor(userId: string, limit = 2) {
    this.user_id = userId
    this.limit = limit
  }
}

/**
 * Featured review item
 */
export interface FeaturedReviewItem {
  skill_id: string
  skill_name: string
  verified_public_proficiency_code: string
  avg_percentage: number
  total_reviews: number
  reviewer_name: string
  reviewer_role: string
  stars: number
  content: string
  task_name: string
}

/**
 * GetFeaturedReviewsQuery
 *
 * Fetches top reviewed skills for featured insights display.
 *
 * CQRS Pattern: Read operation (Application Layer - Orchestration)
 * Uses repository for data access (Infra Layer)
 * Returns top N skills sorted by (total_reviews DESC, avg_percentage DESC)
 * Uses caching for performance (5 min TTL)
 */
export default class GetFeaturedReviewsQuery extends BaseQuery<
  GetFeaturedReviewsDTO,
  FeaturedReviewItem[]
> {
  constructor(
    execCtx: UserActionContext,
    private readonly skillReader: FeaturedReviewSkillReader,
    private readonly profiles: UserProfileRepository
  ) {
    super(execCtx)
  }

  async handle(dto: GetFeaturedReviewsDTO): Promise<FeaturedReviewItem[]> {
    const cacheKey = `users:featured_reviews:v2:${dto.user_id}:${dto.limit}`

    return await this.executeWithCache(cacheKey, 300, async () => {
      const topSkills = await this.profiles.findTopReviewedSkills(dto.user_id, dto.limit)
      const skillIds = topSkills.map((skill) => skill.skill_id)
      const skillSummaries = await this.skillReader.findSkillSummariesByIds(skillIds)
      const skillNameById = new Map(
        skillSummaries.map((skillSummary) => [skillSummary.id, skillSummary.name])
      )
      const missingSkillIds = skillIds.filter((skillId) => !skillNameById.has(skillId))

      if (missingSkillIds.length > 0) {
        throw new InvariantViolationException(
          `Featured review projection is missing skill facts for user ${dto.user_id}: ${missingSkillIds.join(', ')}`,
          {
            details: {
              userId: dto.user_id,
              missingSkillIds,
            },
          }
        )
      }

      return topSkills.map((skill): FeaturedReviewItem => {
        const skillName = skillNameById.get(skill.skill_id)
        if (skillName === undefined) {
          throw new InvariantViolationException(
            `Featured review projection lost skill fact ${skill.skill_id} for user ${dto.user_id}`
          )
        }
        const avgPercentage = this.toNumber(skill.avg_percentage)
        const content =
          skill.total_reviews > 0
            ? `${skillName} đang giữ mức ${this.getLevelLabel(skill.verified_public_proficiency_code)} với điểm trung bình ${avgPercentage.toFixed(1)}%.`
            : `${skillName} mới được khai báo, chưa có lượt review để chấm điểm.`

        return {
          skill_id: skill.skill_id,
          skill_name: skillName,
          verified_public_proficiency_code: skill.verified_public_proficiency_code,
          avg_percentage: avgPercentage,
          total_reviews: skill.total_reviews,
          reviewer_name: 'Tổng hợp đánh giá',
          reviewer_role: `${skill.total_reviews} lượt đánh giá`,
          stars: Math.max(1, Math.min(5, Math.round((avgPercentage || 20) / 20))),
          content,
          task_name: `Skill: ${skillName}`,
        }
      })
    })
  }

  private getLevelLabel(levelCode: string): string {
    return getCanonicalProficiencyLevelLabel(levelCode, levelCode)
  }

  private toNumber(value: TopReviewedSkillRow['avg_percentage']): number {
    if (typeof value === 'number') {
      return value
    }
    if (typeof value === 'string') {
      const parsed = Number(value)
      return Number.isFinite(parsed) ? parsed : 0
    }
    return 0
  }
}
