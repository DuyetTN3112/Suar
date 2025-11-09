import type { TalentSearchDocument } from '#modules/search/domain/talent_search_document'
import type { TalentSearchDocumentReader } from '#modules/users/application/ports/talent_search_document_reader'
import { talentSearchDocumentReader as defaultTalentSearchDocumentReader } from '#modules/users/public_contracts/user_search_indexing'

export class TalentSearchDocumentBuilder {
  constructor(
    private readonly talentSearchDocumentReader: TalentSearchDocumentReader = defaultTalentSearchDocumentReader
  ) {}

  async build(userId: string): Promise<TalentSearchDocument> {
    const user = await this.talentSearchDocumentReader.findTalentSearchDocumentRecord(userId)

    return {
      user_id: user.userId,
      username: user.username,
      display_name: user.username,
      headline: user.headline,
      bio: user.bio,
      status: user.status,
      is_searchable: user.isSearchable,
      skill_ids: user.skills.map((skill) => skill.skillId),
      skills_text: user.skills.map((skill) => skill.skillName).join(' '),
      business_domains: [],
      problem_categories: [],
      task_types: [],
      trust_score: user.trustScore,
      completed_tasks: user.completedTasks,
      reviewed_skills_count: user.reviewedSkillsCount,
      imported_skills_count: user.importedSkillsCount,
      under_dispute_skills_count: user.underDisputeSkillsCount,
      latest_confidence_signal: user.latestConfidenceSignal,
      updated_at: user.updatedAt,
    }
  }
}
