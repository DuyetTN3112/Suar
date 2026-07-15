import type { ElasticsearchSemanticBindings } from '#modules/search/infra/adapters/search-discovery/filtering/elasticsearch_filter_compiler'
import type { ElasticsearchFilterHitMapperInput } from '#modules/search/infra/adapters/search-discovery/filtering/elasticsearch_filter_query_executor'
import type { SearchDiscoveryHit } from '#modules/search/public_contracts/search_discovery_contract'
import type {
  TalentSearchDiscoveryDocument,
  TalentSearchDiscoverySkillEvidence,
} from '#modules/search/public_contracts/talent_search_discovery_document'

export type { TalentSearchDiscoveryDocument } from '#modules/search/public_contracts/talent_search_discovery_document'

export const TALENT_SEARCH_DISCOVERY_ID_FIELD = 'talent.id'
export const TALENT_SEARCH_DISCOVERY_RANKING_VERSION = 'talents.lexical.v1'
export const TALENT_SEARCH_DISCOVERY_TEXT_FIELDS = [
  'username^5',
  'display_name^4',
  'headline^4',
  'skills_text^3',
  'accomplishments_text^3',
  'bio',
] as const

const multiValue = (path: string) => ({
  type: 'multi_value' as const,
  path,
  presencePath: `${path}_known`,
  cardinalityPath: `${path}_count`,
  facetable: true,
  exposeMissingCount: true,
  exposeCoverage: true,
})

export const TALENT_SEARCH_DISCOVERY_BINDINGS: ElasticsearchSemanticBindings = {
  [TALENT_SEARCH_DISCOVERY_ID_FIELD]: { type: 'scalar', path: 'user_id', sortable: true },
  'talent.skills': multiValue('skill_ids'),
  'talent.canonicalSkills': multiValue('canonical_skill_ids'),
  'talent.skillCategories': multiValue('skill_category_refs'),
  'talent.skillEvidence': {
    type: 'relation',
    path: 'skill_evidence',
    presencePath: 'skill_evidence_known',
    relationBindings: {
      skillId: { type: 'scalar', path: 'skill_evidence.skill_id' },
      proficiencyOrder: { type: 'number', path: 'skill_evidence.proficiency_order' },
      reviewState: { type: 'scalar', path: 'skill_evidence.review_state' },
    },
  },
  'talent.businessDomains': multiValue('business_domains'),
  'talent.problemCategories': multiValue('problem_categories'),
  'talent.taskTypes': multiValue('task_types'),
  'talent.technologies': multiValue('technologies'),
  'talent.trustScore': { type: 'number', path: 'trust_score', sortable: true },
  'talent.completedTasks': { type: 'number', path: 'completed_tasks', sortable: true },
  'talent.updatedAt': { type: 'date_time', path: 'updated_at', sortable: true },
  'talent.availableFrom': { type: 'date_time', path: 'available_from', facetable: true },
  'permission.talent.active': { type: 'boolean', path: 'is_active' },
  'permission.talent.searchable': { type: 'boolean', path: 'is_searchable' },
}

export function mapTalentSearchDiscoveryHit(
  input: ElasticsearchFilterHitMapperInput
): SearchDiscoveryHit<TalentSearchDiscoveryDocument> {
  const userId = requiredString(input.source, 'user_id')
  const username = requiredString(input.source, 'username')
  const displayName = requiredString(input.source, 'display_name')
  const headline = optionalString(input.source, 'headline')
  const bio = optionalString(input.source, 'bio')
  if (userId !== input.id) throw new TypeError('Talent discovery hit identity mismatch')
  return {
    id: `talent:${userId}`,
    entityType: 'talent',
    entityId: userId,
    source: 'talents',
    rank: 0,
    score: input.score,
    presentation: {
      title: username,
      url: `/org/talents/open/${userId}`,
      sourceLabel: 'Talent name',
      snippets: [headline ?? bio ?? username],
      breadcrumbs: [],
      primaryActionLabel: 'Open talent',
    },
    document: {
      userId,
      username,
      displayName,
      headline,
      bio,
      skills: stringArray(input.source, 'skill_ids'),
      canonicalSkills: stringArray(input.source, 'canonical_skill_ids'),
      skillCategories: stringArray(input.source, 'skill_category_refs'),
      approvedSkillAliasesText: optionalString(input.source, 'approved_skill_aliases_text'),
      skillTaxonomyVersions: stringArray(input.source, 'skill_taxonomy_versions'),
      skillAssignmentProvenance: stringArray(input.source, 'skill_assignment_provenance'),
      skillAssignmentReviewStates: stringArray(input.source, 'skill_assignment_review_states'),
      skillEvidence: skillEvidenceArray(input.source, 'skill_evidence'),
      technologies: stringArray(input.source, 'technologies'),
      businessDomains: stringArray(input.source, 'business_domains'),
      problemCategories: stringArray(input.source, 'problem_categories'),
      taskTypes: stringArray(input.source, 'task_types'),
      trustScore: requiredNumber(input.source, 'trust_score'),
      completedTasks: requiredNumber(input.source, 'completed_tasks'),
      updatedAt: requiredString(input.source, 'updated_at'),
      availableFrom: optionalString(input.source, 'available_from'),
    },
  }
}

function requiredString(source: Readonly<Record<string, unknown>>, field: string): string {
  const value = source[field]
  if (typeof value !== 'string' || value.length === 0)
    throw new TypeError('Invalid Talent discovery document')
  return value
}
function optionalString(source: Readonly<Record<string, unknown>>, field: string): string | null {
  const value = source[field]
  if (value === undefined || value === null) return null
  if (typeof value !== 'string') throw new TypeError('Invalid Talent discovery document')
  return value
}
function requiredNumber(source: Readonly<Record<string, unknown>>, field: string): number {
  const value = source[field]
  if (typeof value !== 'number' || !Number.isFinite(value))
    throw new TypeError('Invalid Talent discovery document')
  return value
}
function stringArray(source: Readonly<Record<string, unknown>>, field: string): readonly string[] {
  const value = source[field]
  if (value === undefined) return []
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new TypeError('Invalid Talent discovery document')
  }
  return [...new Set(value)] as string[]
}

function skillEvidenceArray(
  source: Readonly<Record<string, unknown>>,
  field: string
): readonly TalentSearchDiscoverySkillEvidence[] {
  const value = source[field]
  if (value === undefined) return []
  if (!Array.isArray(value) || value.some((item) => item === null || typeof item !== 'object')) {
    throw new TypeError('Invalid Talent discovery document')
  }

  return value.map((item) => {
    const evidence = item as Record<string, unknown>
    return {
      skillId: requiredString(evidence, 'skill_id'),
      proficiencyCode: requiredString(evidence, 'proficiency_code'),
      proficiencyOrder: requiredNumber(evidence, 'proficiency_order'),
      source: requiredString(evidence, 'source'),
      reviewState: requiredString(evidence, 'review_state'),
    }
  })
}
