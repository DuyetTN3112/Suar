import type { SkillDateValue } from '../skill_catalog_repository.js'
import type { SkillTransaction } from '../skill_transaction.js'

export interface ProficiencyLevelRecord {
  id: string
  scale_id: string
  ordinal: number
  code: string
  display_name: string
  short_name: string | null
  normalized_value: number
  generic_description: string | null
  sort_order: number
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

export interface ProficiencyScaleRecord {
  id: string
  code: string
  name: string
  version: number
  is_active: boolean
  effective_from: SkillDateValue | null
  effective_to: SkillDateValue | null
  created_at: SkillDateValue
  updated_at: SkillDateValue
  levels: ProficiencyLevelRecord[]
}

export interface ProficiencyScaleRepository {
  getActiveScaleWithLevels(
    transaction?: SkillTransaction
  ): Promise<ProficiencyScaleRecord | null>
  findByCode(code: string, transaction?: SkillTransaction): Promise<ProficiencyScaleRecord | null>
  findLevelByCode(
    scaleId: string,
    code: string,
    transaction?: SkillTransaction
  ): Promise<ProficiencyLevelRecord | null>
  findLevelsByIds(
    ids: string[],
    transaction?: SkillTransaction
  ): Promise<ProficiencyLevelRecord[]>
  findLevelById(
    id: string,
    transaction?: SkillTransaction
  ): Promise<ProficiencyLevelRecord | null>
}
