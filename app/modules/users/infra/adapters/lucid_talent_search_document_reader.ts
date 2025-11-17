import { buildTalentExplainabilitySummaryByUserId } from '#modules/users/actions/support/talent_explainability_summary'
import type {
  TalentSearchDocumentReader,
  TalentSearchDocumentRecord,
} from '#modules/users/application/ports/talent_search_document_reader'
import User from '#modules/users/infra/models/user'

export class LucidTalentSearchDocumentReader implements TalentSearchDocumentReader {
  async findTalentSearchDocumentRecord(userId: string): Promise<TalentSearchDocumentRecord> {
    const user = await User.query()
      .where('id', userId)
      .preload('skills', (query) => {
        void query.preload('skill')
      })
      .firstOrFail()

    const explainabilitySummary = await buildTalentExplainabilitySummaryByUserId([user.id])
    const explainability = explainabilitySummary.get(user.id)
    const profileSettings = user.profile_settings
    const trustData = user.trust_data
    const skills = user.skills.map((userSkill) => userSkill.skill)

    return {
      userId: user.id,
      username: user.username,
      headline: profileSettings?.custom_headline ?? null,
      bio: user.bio,
      status: user.status,
      isSearchable: profileSettings?.is_searchable ?? false,
      skills: skills.map((skill) => ({
        skillId: skill.id,
        skillName: skill.skill_name,
      })),
      trustScore: trustData?.calculated_score ?? 0,
      completedTasks: user.external_contributor_completed_tasks_count,
      reviewedSkillsCount: explainability?.reviewedSkillsCount ?? 0,
      importedSkillsCount: explainability?.importedSkillsCount ?? 0,
      underDisputeSkillsCount: explainability?.underDisputeSkillsCount ?? 0,
      latestConfidenceSignal: explainability?.latestConfidenceSignal ?? null,
      updatedAt: user.updated_at.toISO() ?? new Date().toISOString(),
    }
  }
}
