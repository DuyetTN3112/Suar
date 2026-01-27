import type { UserSkillCatalog } from '#modules/users/actions/ports/outbound/user_skill_catalog'
import type { UserTalentRepository } from '#modules/users/actions/ports/outbound/user_talent_repository'
import { hydrateUserSkillProfileRecords } from '#modules/users/actions/queries/hydrate_user_skill_profile_records_query'
import User from '#modules/users/infra/models/user'
import * as userSkillQueries from '#modules/users/infra/repositories/read/user_skill_queries'

export class LucidTalentSearchDocumentReader {
  constructor(
    private readonly skillCatalog: UserSkillCatalog,
    private readonly talents: UserTalentRepository
  ) {}

  async findTalentSearchDocumentRecord(userId: string) {
    const user = await User.query().where('id', userId).first()
    if (!user || user.deleted_at) {
      return null
    }

    const [explainabilitySummary, rawSkills] = await Promise.all([
      this.talents.getExplainabilitySummaries([user.id]),
      userSkillQueries.listByUser(user.id),
    ])
    const hydratedSkills = await hydrateUserSkillProfileRecords(
      rawSkills,
      this.skillCatalog
    )
    const explainability = explainabilitySummary.get(user.id)
    const profileSettings = user.profile_settings
    const trustData = user.trust_data
    const skills = hydratedSkills.flatMap((userSkill) =>
      userSkill.skill
        ? [{ id: userSkill.skill_id, skill_name: userSkill.skill.skill_name }]
        : []
    )

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
