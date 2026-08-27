import { findCanonicalProficiencyLevelOption } from '#modules/skills/public_contracts/rubric-and-proficiency/proficiency_level_catalog'
import { canonicalTaxonomyRef } from '#modules/taxonomy/public_contracts/taxonomy-governance/taxonomy_term_contracts'
import type { UserSkillCatalog } from '#modules/users/actions/ports/outbound/profile-skills/user_skill_catalog'
import type { TalentPublicAccomplishmentReader } from '#modules/users/actions/ports/outbound/talent_public_accomplishment_reader'
import type { TalentSkillTaxonomyCatalogReader } from '#modules/users/actions/ports/outbound/talent_skill_taxonomy_catalog_reader'
import type { UserTalentRepository } from '#modules/users/actions/ports/outbound/user_talent_repository'
import { hydrateUserSkillProfileRecords } from '#modules/users/actions/queries/profile-skills/hydrate_user_skill_profile_records_query'
import User from '#modules/users/infra/models/profile/user'
import * as userSkillQueries from '#modules/users/infra/repositories/read/profile-skills/user_skill_queries'

export class LucidTalentSearchDocumentReader {
  constructor(
    private readonly skillCatalog: UserSkillCatalog,
    private readonly talents: UserTalentRepository,
    private readonly publicAccomplishments: TalentPublicAccomplishmentReader = {
      listForUser: () => Promise.resolve([]),
    },
    private readonly skillTaxonomyCatalog?: TalentSkillTaxonomyCatalogReader
  ) {}

  async findTalentSearchDocumentRecord(userId: string) {
    const user = await User.query().where('id', userId).first()
    if (!user || user.deleted_at) {
      return null
    }

    const [explainabilitySummary, rawSkills, publicAccomplishments] = await Promise.all([
      this.talents.getExplainabilitySummaries([user.id]),
      userSkillQueries.listByUser(user.id),
      this.publicAccomplishments.listForUser(user.id),
    ])
    const hydratedSkills = await hydrateUserSkillProfileRecords(rawSkills, this.skillCatalog)
    const skillTaxonomy = this.skillTaxonomyCatalog
      ? await this.skillTaxonomyCatalog.loadSnapshot()
      : null
    const skillTerms = new Map(
      skillTaxonomy?.terms.map((sourceTerm) => [sourceTerm.term.ref.termId, sourceTerm]) ?? []
    )
    const isPublicTaxonomyTerm = (
      sourceTerm: NonNullable<typeof skillTaxonomy>['terms'][number]
    ): boolean =>
      sourceTerm.visibility.kind === 'public' &&
      sourceTerm.term.parentRefs.every((parentRef) => {
        const parent = skillTerms.get(parentRef.termId)
        return parent?.visibility.kind === 'public'
      })
    const rawSkillById = new Map(rawSkills.map((skill) => [skill.skill_id, skill]))
    const explainability = explainabilitySummary.get(user.id)
    const profileSettings = user.profile_settings
    const trustData = user.trust_data
    const skills = hydratedSkills.flatMap((userSkill) =>
      userSkill.skill
        ? (() => {
            const sourceTerm = skillTerms.get(userSkill.skill_id)
            if (sourceTerm && !isPublicTaxonomyTerm(sourceTerm)) return []
            const term = sourceTerm?.term
            const rawSkill = rawSkillById.get(userSkill.skill_id)
            const proficiency = findCanonicalProficiencyLevelOption(
              rawSkill?.verified_public_proficiency_code
            )
            return [
              {
                id: userSkill.skill_id,
                skill_name: userSkill.skill.skill_name,
                ...(term
                  ? {
                      canonicalRef: canonicalTaxonomyRef(term.ref),
                      categoryRefs: term.parentRefs.map(canonicalTaxonomyRef),
                      approvedAliases: term.aliases
                        .filter((alias) => alias.reviewState === 'reviewed')
                        .map((alias) => alias.value),
                      taxonomyVersion: term.version,
                    }
                  : {}),
                assignmentProvenance: rawSkill?.source === 'imported' ? 'imported' : 'explicit',
                assignmentReviewState: rawSkill?.source === 'reviewed' ? 'reviewed' : 'pending',
                ...(proficiency
                  ? {
                      proficiencyCode: proficiency.value,
                      proficiencyOrder: proficiency.order,
                      evidenceSource: rawSkill?.source ?? 'unknown',
                      evidenceReviewState: rawSkill?.source === 'reviewed' ? 'reviewed' : 'pending',
                    }
                  : {}),
              },
            ]
          })()
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
        ...(skill.canonicalRef
          ? {
              canonicalRef: skill.canonicalRef,
              categoryRefs: skill.categoryRefs,
              approvedAliases: skill.approvedAliases,
              taxonomyVersion: skill.taxonomyVersion,
            }
          : {}),
        ...(skill.proficiencyCode !== undefined && skill.proficiencyOrder !== undefined
          ? {
              proficiencyCode: skill.proficiencyCode,
              proficiencyOrder: skill.proficiencyOrder,
              evidenceSource: skill.evidenceSource,
              evidenceReviewState: skill.evidenceReviewState,
            }
          : {}),
        assignmentProvenance: skill.assignmentProvenance,
        assignmentReviewState: skill.assignmentReviewState,
      })),
      publicAccomplishments,
      trustScore: trustData?.calculated_score ?? 0,
      completedTasks: user.external_contributor_completed_tasks_count,
      reviewedSkillsCount: explainability?.reviewedSkillsCount ?? 0,
      importedSkillsCount: explainability?.importedSkillsCount ?? 0,
      underDisputeSkillsCount: explainability?.underDisputeSkillsCount ?? 0,
      latestConfidenceSignal: explainability?.latestConfidenceSignal ?? null,
      availableFrom: profileSettings?.available_from ?? null,
      updatedAt: user.updated_at.toISO() ?? new Date().toISOString(),
    }
  }
}
