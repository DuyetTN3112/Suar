import type { ProficiencyLevelRecord } from './proficiency_scale_repository.js'
import type { SkillDateValue, SkillRecord } from './skill_catalog_repository.js'
import type { SkillTransaction } from './skill_transaction.js'

import type { SkillRubricVersionStatus } from '#modules/skills/public_contracts/skill_constants'

export interface SkillAliasRecord {
  skill: SkillRecord
}

export interface SkillRubricLevelRecord {
  id: string
  rubric_version_id: string
  proficiency_level_id: string
  summary: string | null
  knowledge_expectations: string[] | null
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
  level: ProficiencyLevelRecord
}

export interface SkillRubricVersionRecord {
  id: string
  skill_id: string
  version: number
  status: SkillRubricVersionStatus
  effective_from: SkillDateValue | null
  effective_to: SkillDateValue | null
  created_by: string | null
  change_summary: string | null
  created_at: SkillDateValue
  updated_at: SkillDateValue
  levels: SkillRubricLevelRecord[]
}

export interface SkillRubricRepository {
  findSkill(id: string, transaction?: SkillTransaction): Promise<SkillRecord | null>
  findActiveSkillByCode(
    code: string,
    transaction?: SkillTransaction
  ): Promise<SkillRecord | null>
  findActiveSkillByName(
    name: string,
    transaction?: SkillTransaction
  ): Promise<SkillRecord | null>
  findAliasByNormalized(
    normalizedAlias: string,
    transaction?: SkillTransaction
  ): Promise<SkillAliasRecord | null>
  findRubricVersion(
    id: string,
    transaction?: SkillTransaction
  ): Promise<SkillRubricVersionRecord | null>
  findDraftBySkill(
    skillId: string,
    transaction?: SkillTransaction
  ): Promise<SkillRubricVersionRecord | null>
  findMaxVersionBySkill(skillId: string, transaction?: SkillTransaction): Promise<number>
  findPublishedBySkill(
    skillId: string,
    transaction?: SkillTransaction
  ): Promise<SkillRubricVersionRecord | null>
  createDraftVersion(
    skillId: string,
    version: number,
    createdBy?: string,
    changeSummary?: string,
    transaction?: SkillTransaction
  ): Promise<SkillRubricVersionRecord>
  findRubricLevelsByVersion(
    versionId: string,
    transaction?: SkillTransaction
  ): Promise<SkillRubricLevelRecord[]>
  createOrUpdateLevel(
    versionId: string,
    levelId: string,
    payload: Record<string, unknown>,
    transaction?: SkillTransaction
  ): Promise<SkillRubricLevelRecord>
  publishVersion(
    versionId: string,
    effectiveFrom: string,
    transaction: SkillTransaction
  ): Promise<SkillRubricVersionRecord | null>
  archivePublishedVersions(
    skillId: string,
    excludeId: string,
    effectiveTo: string,
    transaction: SkillTransaction
  ): Promise<void>
  findVersionsBySkillWithLevels(
    skillId: string,
    transaction?: SkillTransaction
  ): Promise<SkillRubricVersionRecord[]>
}
