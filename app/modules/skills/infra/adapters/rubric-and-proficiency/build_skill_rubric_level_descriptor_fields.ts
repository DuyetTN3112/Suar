interface ProficiencyLevelDescriptorSource {
  expected_knowledge?: string | null
  expected_execution?: string | null
  autonomy_descriptor?: string | null
  complexity_descriptor?: string | null
  quality_descriptor?: string | null
  collaboration_descriptor?: string | null
  observable_behaviors?: string[] | null
  positive_examples?: string[] | null
  negative_examples?: string[] | null
  evidence_guidance?: string | null
  ceiling_guidance?: string | null
}

export interface SkillRubricLevelDescriptorFields {
  knowledge_expectations: string[] | null
  observable_behaviors: string[] | null
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

export function buildSkillRubricLevelDescriptorFields(
  level: ProficiencyLevelDescriptorSource
): SkillRubricLevelDescriptorFields {
  return {
    knowledge_expectations: level.expected_knowledge ? [level.expected_knowledge] : null,
    observable_behaviors: level.observable_behaviors ?? null,
    positive_examples: level.positive_examples ?? null,
    negative_examples: level.negative_examples ?? null,
    evidence_guidance: level.evidence_guidance ?? null,
    expected_execution: level.expected_execution ?? null,
    autonomy_descriptor: level.autonomy_descriptor ?? null,
    complexity_descriptor: level.complexity_descriptor ?? null,
    quality_descriptor: level.quality_descriptor ?? null,
    collaboration_descriptor: level.collaboration_descriptor ?? null,
    ceiling_guidance: level.ceiling_guidance ?? null,
  }
}
