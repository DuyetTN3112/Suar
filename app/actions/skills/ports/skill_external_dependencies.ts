import type { DatabaseId } from '#types/database'

export interface SkillActiveSkillOption {
  id: DatabaseId
  skill_name: string
  category_code: string | null
}

export interface SkillReader {
  listActiveSkills(): Promise<SkillActiveSkillOption[]>
}

export interface SkillExternalDependencies {
  skill: SkillReader
}
