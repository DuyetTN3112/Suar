/** Maps proficiency read models to the admin HTTP response shape. */
import {
  buildProficiencyFrameworkDescriptor,
  findCanonicalProficiencyLevelOption,
  getCanonicalProficiencyLevelValue,
} from '#modules/skills/public_contracts/rubric-and-proficiency/proficiency_framework'

type ProficiencyLevelLike = {
  id: string
  ordinal: number
  code: string
  display_name: string
  short_name: string | null
  normalized_value: number | null
  generic_description: string | null
  sort_order: number | null
  expected_knowledge: string | null
  expected_execution: string | null
  autonomy_descriptor: string | null
  complexity_descriptor: string | null
  quality_descriptor: string | null
  collaboration_descriptor: string | null
  observable_behaviors: string[] | null
  positive_examples: string[] | null
  negative_examples: string[] | null
  evidence_guidance: string | null
  ceiling_guidance: string | null
}

type ProficiencyScaleLike = {
  id: string
  code: string
  name: string
  version: string | number
  is_active: boolean
  effective_from: { toISODate(): string | null } | null
  effective_to: { toISODate(): string | null } | null
  created_at: { toISO(): string | null }
  updated_at: { toISO(): string | null }
  levels: ProficiencyLevelLike[]
}

type SkillRubricLevelLike = {
  id: string
  level: ProficiencyLevelLike
  summary: string | null
  knowledge_expectations: string | string[] | null
  observable_behaviors: string[] | null
  independence_expectations: string | null
  complexity_expectations: string | null
  impact_scope_expectations: string | null
  positive_examples: string[] | null
  negative_examples: string[] | null
  evidence_guidance: string | null
  expected_execution: string | null
  autonomy_descriptor: string | null
  complexity_descriptor: string | null
  quality_descriptor: string | null
  collaboration_descriptor: string | null
  ceiling_guidance: string | null
}

function mapCanonicalLevelDisplay(level: ProficiencyLevelLike) {
  const option =
    findCanonicalProficiencyLevelOption(level.code) ??
    findCanonicalProficiencyLevelOption(level.display_name) ??
    null

  return {
    code: getCanonicalProficiencyLevelValue(level.code, level.code),
    displayName: option?.shortLabel ?? level.display_name,
    shortName: option?.code ?? level.short_name,
  }
}

export function mapProficiencyScaleLevel(level: ProficiencyLevelLike) {
  const canonical = mapCanonicalLevelDisplay(level)

  return {
    id: level.id,
    ordinal: level.ordinal,
    code: canonical.code,
    displayName: canonical.displayName,
    shortName: canonical.shortName,
    normalizedValue: level.normalized_value,
    genericDescription: level.generic_description,
    sortOrder: level.sort_order,
    expectedKnowledge: level.expected_knowledge,
    expectedExecution: level.expected_execution,
    autonomyDescriptor: level.autonomy_descriptor,
    complexityDescriptor: level.complexity_descriptor,
    qualityDescriptor: level.quality_descriptor,
    collaborationDescriptor: level.collaboration_descriptor,
    observableBehaviors: level.observable_behaviors,
    positiveExamples: level.positive_examples,
    negativeExamples: level.negative_examples,
    evidenceGuidance: level.evidence_guidance,
    ceilingGuidance: level.ceiling_guidance,
    frameworkDescriptor: buildProficiencyFrameworkDescriptor(level),
  }
}

export function mapProficiencyScale(scale: ProficiencyScaleLike) {
  return {
    id: scale.id,
    code: scale.code,
    name: scale.name,
    version: scale.version,
    isActive: scale.is_active,
    effectiveFrom: scale.effective_from?.toISODate() ?? null,
    effectiveTo: scale.effective_to?.toISODate() ?? null,
    levels: scale.levels
      .sort((a, b) => a.ordinal - b.ordinal)
      .map((level) => mapProficiencyScaleLevel(level)),
    createdAt: scale.created_at.toISO(),
    updatedAt: scale.updated_at.toISO(),
  }
}

export function mapSkillRubricLevel(level: SkillRubricLevelLike) {
  const canonical = mapCanonicalLevelDisplay(level.level)

  return {
    id: level.id,
    proficiencyLevel: {
      id: level.level.id,
      ordinal: level.level.ordinal,
      code: canonical.code,
      displayName: canonical.displayName,
      shortName: canonical.shortName,
      genericDescription: level.level.generic_description,
      expectedKnowledge: level.level.expected_knowledge,
      expectedExecution: level.level.expected_execution,
      autonomyDescriptor: level.level.autonomy_descriptor,
      complexityDescriptor: level.level.complexity_descriptor,
      qualityDescriptor: level.level.quality_descriptor,
      collaborationDescriptor: level.level.collaboration_descriptor,
      observableBehaviors: level.level.observable_behaviors,
      positiveExamples: level.level.positive_examples,
      negativeExamples: level.level.negative_examples,
      evidenceGuidance: level.level.evidence_guidance,
      ceilingGuidance: level.level.ceiling_guidance,
      frameworkDescriptor: buildProficiencyFrameworkDescriptor(level.level),
    },
    summary: level.summary,
    knowledgeExpectations: level.knowledge_expectations,
    observableBehaviors: level.observable_behaviors,
    independenceExpectations: level.independence_expectations,
    complexityExpectations: level.complexity_expectations,
    impactScopeExpectations: level.impact_scope_expectations,
    positiveExamples: level.positive_examples,
    negativeExamples: level.negative_examples,
    evidenceGuidance: level.evidence_guidance,
    expectedExecution: level.expected_execution,
    autonomyDescriptor: level.autonomy_descriptor,
    complexityDescriptor: level.complexity_descriptor,
    qualityDescriptor: level.quality_descriptor,
    collaborationDescriptor: level.collaboration_descriptor,
    ceilingGuidance: level.ceiling_guidance,
  }
}
