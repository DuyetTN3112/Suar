import type { DatabaseId } from '#types/database'

export interface SharedActiveSkillOption {
  id: DatabaseId
  skill_name: string
  category_code: string | null
}

export interface SharedSkillReader {
  listActiveSkills(): Promise<SharedActiveSkillOption[]>
}

export interface SharedExternalDependencies {
  skill: SharedSkillReader
}
