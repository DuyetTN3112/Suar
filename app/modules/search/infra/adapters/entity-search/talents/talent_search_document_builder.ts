import type { TalentSearchDocumentReader } from '#modules/search/actions/ports/outbound/talent_search_document_reader'
import type { TalentSearchDocument } from '#modules/search/domain/entity-search/talent_search_document'

export class TalentSearchDocumentBuilder {
  constructor(
    private readonly talentSearchDocumentReader: TalentSearchDocumentReader
  ) {}

  async build(
    userId: string,
    signal?: AbortSignal
  ): Promise<TalentSearchDocument | null> {
    signal?.throwIfAborted()
    const user = await this.talentSearchDocumentReader.findTalentSearchDocumentRecord(userId)
    signal?.throwIfAborted()
    if (!user) {
      return null
    }

    const canonicalSkillIds = [...new Set(user.skills.flatMap((skill) => skill.canonicalRef ?? []))]
    const skillCategoryRefs = [
      ...new Set(user.skills.flatMap((skill) => skill.categoryRefs ?? [])),
    ]
    const approvedSkillAliases = [
      ...new Set(user.skills.flatMap((skill) => skill.approvedAliases ?? [])),
    ]
    const skillTaxonomyVersions = [
      ...new Set(
        user.skills.flatMap((skill) =>
          typeof skill.taxonomyVersion === 'number' ? [`skills:${skill.taxonomyVersion}`] : []
        )
      ),
    ]
    const skillAssignmentProvenance = [
      ...new Set(user.skills.flatMap((skill) => skill.assignmentProvenance ?? [])),
    ]
    const skillAssignmentReviewStates = [
      ...new Set(user.skills.flatMap((skill) => skill.assignmentReviewState ?? [])),
    ]
    const skillEvidence = user.skills.flatMap((skill) =>
      skill.proficiencyCode !== undefined && skill.proficiencyOrder !== undefined
        ? [{
            skill_id: skill.skillId,
            proficiency_code: skill.proficiencyCode,
            proficiency_order: skill.proficiencyOrder,
            source: skill.evidenceSource ?? 'unknown',
            review_state: skill.evidenceReviewState ?? 'unknown',
          }]
        : []
    )
    const canonicalSkillProjectionKnown = user.skills.every(
      (skill) => skill.canonicalRef !== undefined
    )

    return {
      user_id: user.userId,
      username: user.username,
      display_name: user.username,
      headline: user.headline,
      bio: user.bio,
      status: user.status,
      is_searchable: user.isSearchable,
      is_active: user.status === 'active',
      skill_ids: user.skills.map((skill) => skill.skillId),
      skill_ids_known: true,
      skill_ids_count: user.skills.length,
      skills_text: user.skills.map((skill) => skill.skillName).join(' '),
      canonical_skill_ids: canonicalSkillIds,
      canonical_skill_ids_known: canonicalSkillProjectionKnown,
      canonical_skill_ids_count: canonicalSkillIds.length,
      skill_category_refs: skillCategoryRefs,
      skill_category_refs_known: canonicalSkillProjectionKnown,
      skill_category_refs_count: skillCategoryRefs.length,
      approved_skill_aliases_text: approvedSkillAliases.join(' '),
      ...(skillEvidence.length > 0 ? { skill_evidence: skillEvidence } : {}),
      ...(user.skills.some((skill) => skill.proficiencyCode !== undefined)
        ? { skill_evidence_known: skillEvidence.length === user.skills.length }
        : {}),
      skill_taxonomy_versions: skillTaxonomyVersions,
      skill_assignment_provenance: skillAssignmentProvenance,
      skill_assignment_review_states: skillAssignmentReviewStates,
      accomplishments_text: (user.publicAccomplishments ?? [])
        .flatMap((item) => [
          item.title,
          item.conciseStatement,
          item.action,
          item.object,
          item.role,
          ...item.technology,
          ...item.deliverableSummaries,
          ...item.outcomeSummaries,
          ...item.capabilityLabels,
        ])
        .filter((value): value is string => value !== null)
        .join(' '),
      business_domains: [...new Set((user.publicAccomplishments ?? []).flatMap((item) => item.businessDomain ?? []))],
      business_domains_known: true,
      business_domains_count: new Set((user.publicAccomplishments ?? []).flatMap((item) => item.businessDomain ?? [])).size,
      problem_categories: [...new Set((user.publicAccomplishments ?? []).flatMap((item) => item.problemCategory ?? []))],
      problem_categories_known: true,
      problem_categories_count: new Set((user.publicAccomplishments ?? []).flatMap((item) => item.problemCategory ?? [])).size,
      task_types: [...new Set((user.publicAccomplishments ?? []).flatMap((item) => item.taskType ?? []))],
      task_types_known: true,
      task_types_count: new Set((user.publicAccomplishments ?? []).flatMap((item) => item.taskType ?? [])).size,
      technologies: [
        ...new Set((user.publicAccomplishments ?? []).flatMap((item) => item.technology)),
      ],
      technologies_known: true,
      technologies_count: new Set((user.publicAccomplishments ?? []).flatMap((item) => item.technology)).size,
      trust_score: user.trustScore,
      completed_tasks: user.completedTasks,
      reviewed_skills_count: user.reviewedSkillsCount,
      imported_skills_count: user.importedSkillsCount,
      under_dispute_skills_count: user.underDisputeSkillsCount,
      latest_confidence_signal: user.latestConfidenceSignal,
      ...(user.availableFrom !== undefined ? { available_from: user.availableFrom } : {}),
      updated_at: user.updatedAt,
    }
  }
}
