import { skillApplication as skillPublicApi } from '#composition/skills/skill-application/skills_application_composition'
import { ReviewSkillIdentityReader } from '#modules/reviews/actions/ports/outbound/review_projection_enrichment_readers'
import { toLucidReviewTransaction } from '#modules/reviews/infra/adapters/review-core/lucid_review_transaction_runner'

export class SkillReviewIdentityReaderAdapter extends ReviewSkillIdentityReader {
  async findSkillsByIds(
    skillIds: string[],
    trx?: Parameters<ReviewSkillIdentityReader['findSkillsByIds']>[1]
  ) {
    const skills = await skillPublicApi.findIdentityFactsV1(skillIds, toLucidReviewTransaction(trx))
    return skills.map((skill) => ({
      id: skill.id,
      name: skill.name,
      categoryCode: skill.categoryCode,
      is_active: skill.isActive,
    }))
  }
}
