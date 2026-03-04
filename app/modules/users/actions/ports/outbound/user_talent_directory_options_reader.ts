export interface UserTalentDirectorySkillOption {
  id: string
  skill_name: string
  category_code: string | null
  is_active: boolean
}

export interface UserTalentDirectoryTaskOption {
  id: string
  title: string
}

export interface UserTalentDirectoryOptionsReader {
  listActiveSkills(): Promise<UserTalentDirectorySkillOption[]>

  listRootTasks(
    organizationId: string
  ): Promise<UserTalentDirectoryTaskOption[]>
}
