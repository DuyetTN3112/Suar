import type { ProficiencyLevelRecord } from './proficiency_scale_repository.js'
import type { ProjectSkillRecord } from './project_skill_repository.js'
import type { SkillRecord } from './skill_catalog_repository.js'
import type { SkillTransaction } from './skill_transaction.js'

import type { SkillImportance } from '#modules/skills/public_contracts/skill_constants'

export interface ProfessionalRoleTemplateSkillRecord {
  id: string
  role_template_id: string
  skill_id: string
  minimum_level_id: string | null
  target_level_id: string | null
  assessment_ceiling_level_id: string | null
  is_mandatory: boolean
  importance: SkillImportance
  weight: number
  sort_order: number
  skill: SkillRecord
  minimumLevel: ProficiencyLevelRecord | null
  targetLevel: ProficiencyLevelRecord | null
  assessmentCeilingLevel: ProficiencyLevelRecord | null
}

export interface ProfessionalRoleTemplateRecord {
  id: string
  code: string
  name: string
  description: string | null
  is_active: boolean
  template_skills: ProfessionalRoleTemplateSkillRecord[]
}

export interface ProjectProfessionalRoleSkillRecord {
  id: string
  project_professional_role_id: string
  project_skill_id: string
  minimum_level_id: string | null
  target_level_id: string | null
  assessment_ceiling_level_id: string | null
  is_mandatory: boolean
  importance: SkillImportance
  weight: number
  sort_order: number
  notes: string | null
  projectSkill: ProjectSkillRecord
  minimumLevel: ProficiencyLevelRecord | null
  targetLevel: ProficiencyLevelRecord | null
  assessmentCeilingLevel: ProficiencyLevelRecord | null
}

export interface ProjectProfessionalRoleRecord {
  id: string
  project_id: string
  source_template_id: string | null
  code: string
  name: string
  description: string | null
  is_active: boolean
  version: number
  created_by: string | null
  sourceTemplate: ProfessionalRoleTemplateRecord | null
  role_skills: ProjectProfessionalRoleSkillRecord[]
}

export interface CreateProjectProfessionalRoleRecord {
  project_id: string
  source_template_id?: string | null
  code: string
  name: string
  description?: string | null
  is_active?: boolean
  version?: number
  created_by?: string | null
}

export interface CreateProjectProfessionalRoleSkillRecord {
  project_professional_role_id: string
  project_skill_id: string
  minimum_level_id?: string | null
  target_level_id?: string | null
  assessment_ceiling_level_id?: string | null
  is_mandatory?: boolean
  importance?: SkillImportance
  weight?: number
  sort_order?: number
  notes?: string | null
}

export interface UpdateProjectProfessionalRoleSkillRecord {
  minimum_level_id?: string | null
  target_level_id?: string | null
  assessment_ceiling_level_id?: string | null
  is_mandatory?: boolean
  importance?: SkillImportance
  weight?: number
  sort_order?: number
  notes?: string | null
}

export interface ProfessionalRoleRepository {
  findTemplateByCode(
    code: string,
    transaction?: SkillTransaction
  ): Promise<ProfessionalRoleTemplateRecord | null>
  findTemplateById(
    id: string,
    withSkills?: boolean,
    transaction?: SkillTransaction
  ): Promise<ProfessionalRoleTemplateRecord | null>
  listActiveTemplatesWithSkillDetails(
    transaction?: SkillTransaction
  ): Promise<ProfessionalRoleTemplateRecord[]>
  findProjectRoleByCode(
    projectId: string,
    code: string,
    transaction?: SkillTransaction
  ): Promise<ProjectProfessionalRoleRecord | null>
  findProjectRoleById(
    id: string,
    withSkills?: boolean,
    transaction?: SkillTransaction
  ): Promise<ProjectProfessionalRoleRecord | null>
  listProjectRolesWithSkillDetails(
    projectId: string,
    transaction?: SkillTransaction
  ): Promise<ProjectProfessionalRoleRecord[]>
  findProjectRoleSkill(
    projectRoleId: string,
    projectSkillId: string,
    transaction?: SkillTransaction
  ): Promise<ProjectProfessionalRoleSkillRecord | null>
  findProjectRoleSkillById(
    id: string,
    transaction?: SkillTransaction
  ): Promise<ProjectProfessionalRoleSkillRecord | null>
  createProjectRole(
    payload: CreateProjectProfessionalRoleRecord,
    transaction?: SkillTransaction
  ): Promise<ProjectProfessionalRoleRecord>
  createProjectRoleSkill(
    payload: CreateProjectProfessionalRoleSkillRecord,
    transaction?: SkillTransaction
  ): Promise<ProjectProfessionalRoleSkillRecord>
  updateProjectRoleSkill(
    id: string,
    payload: UpdateProjectProfessionalRoleSkillRecord,
    transaction?: SkillTransaction
  ): Promise<ProjectProfessionalRoleSkillRecord | null>
  deactivateProjectRole(
    id: string,
    transaction?: SkillTransaction
  ): Promise<ProjectProfessionalRoleRecord | null>
  deleteProjectRoleSkill(id: string, transaction?: SkillTransaction): Promise<void>
  incrementProjectRoleVersion(id: string, transaction?: SkillTransaction): Promise<void>
}
