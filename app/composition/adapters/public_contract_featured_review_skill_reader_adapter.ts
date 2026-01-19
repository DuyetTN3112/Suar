import { skillApplication as skillPublicApi } from '#composition/skills_application_composition'
import type { SkillSummaryFact } from '#modules/skills/public_contracts/skill_summary_fact'
import type {
  FeaturedReviewSkillReader,
  FeaturedReviewSkillSummary,
} from '#modules/users/actions/ports/outbound/featured_review_skill_reader'

export class PublicContractFeaturedReviewSkillReaderAdapter implements FeaturedReviewSkillReader {
  async findSkillSummariesByIds(skillIds: string[]): Promise<FeaturedReviewSkillSummary[]> {
    const facts: SkillSummaryFact[] = await skillPublicApi.findSummaryFactsByIds(skillIds)

    return facts.map((fact) => ({
      id: fact.id,
      name: fact.name,
    }))
  }
}
