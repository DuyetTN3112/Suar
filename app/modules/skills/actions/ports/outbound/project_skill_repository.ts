import type { SkillRecord } from './skill_catalog_repository.js'
import type { SkillTransaction } from './skill_transaction.js'

export interface ProjectSkillRecord {
  id: string
  project_id: string
  skill_id: string
  display_name_override: string | null
  description_override: string | null
  rubric_version_id: string | null
  is_active: boolean
  is_selectable_for_tasks: boolean
  is_visible_in_project: boolean
  added_by: string | null
  skill: SkillRecord
}

export interface ProjectSkillRubricVersionReference {
  id: string
  skill_id: string
}

export interface CreateProjectSkillRecord {
  project_id: string
  skill_id: string
  added_by?: string | null
  is_active?: boolean
  is_selectable_for_tasks?: boolean
  is_visible_in_project?: boolean
}

export interface UpdateProjectSkillRecord {
  display_name_override?: string | null
  description_override?: string | null
  rubric_version_id?: string | null
  is_active?: boolean
  is_selectable_for_tasks?: boolean
}

export interface ProjectSkillRepository {
  findSkill(id: string, transaction?: SkillTransaction): Promise<SkillRecord | null>
  findActiveSkill(id: string, transaction?: SkillTransaction): Promise<SkillRecord | null>
  findProjectSkill(
    projectId: string,
    skillId: string,
    transaction?: SkillTransaction
  ): Promise<ProjectSkillRecord | null>
  findProjectSkillById(
    id: string,
    transaction?: SkillTransaction
  ): Promise<ProjectSkillRecord | null>
  listProjectSkills(
    projectId: string,
    transaction?: SkillTransaction
  ): Promise<ProjectSkillRecord[]>
  findRubricVersion(
    id: string,
    transaction?: SkillTransaction
  ): Promise<ProjectSkillRubricVersionReference | null>
  createProjectSkill(
    payload: CreateProjectSkillRecord,
    transaction?: SkillTransaction
  ): Promise<ProjectSkillRecord>
  updateProjectSkill(
    id: string,
    payload: UpdateProjectSkillRecord,
    transaction?: SkillTransaction
  ): Promise<ProjectSkillRecord | null>
}
