export interface AdminDateProjection {
  toISO(): string | null
  toISODate(): string | null
}

export interface AdminProficiencyLevelProjection {
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

export interface AdminProficiencyScaleProjection {
  id: string
  code: string
  name: string
  version: string | number
  is_active: boolean
  effective_from: AdminDateProjection | null
  effective_to: AdminDateProjection | null
  created_at: AdminDateProjection
  updated_at: AdminDateProjection
  levels: AdminProficiencyLevelProjection[]
}

export interface AdminSkillProjection {
  id: string
  skill_name: string
  skill_code?: string
  category_code: string | null
  description?: string | null
  is_active: boolean
}

export interface AdminSkillRubricLevelProjection {
  id: string
  level: AdminProficiencyLevelProjection
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

export interface AdminSkillRubricVersionProjection {
  id: string
  version: string | number
  status: string
  effective_from: AdminDateProjection | null
  effective_to: AdminDateProjection | null
  change_summary: string | null
  levels: AdminSkillRubricLevelProjection[]
  created_at: AdminDateProjection
  updated_at: AdminDateProjection
}

export abstract class AdminSkillRubricGateway {
  abstract getActiveScale(): Promise<AdminProficiencyScaleProjection | null>

  abstract listActiveSkills(): Promise<AdminSkillProjection[]>

  abstract resolveSkill(skillIdOrCode: string): Promise<AdminSkillProjection | null>

  abstract getPublishedVersion(skillId: string): Promise<AdminSkillRubricVersionProjection | null>

  abstract createDraftVersion(
    skillId: string,
    actorId?: string,
    changeSummary?: string
  ): Promise<Record<string, unknown>>

  abstract addOrUpdateLevel(
    versionId: string,
    levelId: string,
    payload: Record<string, unknown>
  ): Promise<Record<string, unknown>>

  abstract publishVersion(versionId: string): Promise<Record<string, unknown>>
}
