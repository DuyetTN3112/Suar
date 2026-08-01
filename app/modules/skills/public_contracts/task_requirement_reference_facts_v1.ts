export interface TaskRequirementSkillFactV1 {
  id: string
  name: string
  code: string
  categoryCode: string
  iconUrl: string | null
}

export interface TaskRequirementProficiencyLevelFactV1 {
  id: string
  code: string
  displayName: string
  shortName: string | null
  ordinal: number
}

export interface TaskRequirementReferenceFactsV1 {
  contractVersion: 1
  skills: TaskRequirementSkillFactV1[]
  proficiencyLevels: TaskRequirementProficiencyLevelFactV1[]
}

export interface TaskRequirementReferenceFactIdsV1 {
  skillIds: string[]
  proficiencyLevelIds: string[]
}
