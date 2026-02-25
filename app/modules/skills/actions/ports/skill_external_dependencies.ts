
export interface SkillActiveSkillOption {
  id: string
  skill_name: string
  category_code: string | null
}

export interface SkillReader {
  listActiveSkills(): Promise<SkillActiveSkillOption[]>
}

export interface SkillExternalDependencies {
  skill: SkillReader
}
