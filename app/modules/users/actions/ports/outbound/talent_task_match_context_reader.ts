export interface UserTalentTaskRequirement {
  skillId: string
  skillName: string
  requiredPublicProficiencyCode: string
  isMandatory: boolean
  minimumLevelId: string | null
  targetLevelId: string | null
  assessmentCeilingLevelId: string | null
  importance: string
  weight: number
  projectSkillId: string | null
  rubricVersionId: string | null
}

export interface UserTalentTaskMatchContext {
  taskId: string
  businessDomain: string | null
  problemCategory: string | null
  taskType: string | null
  requiredSkills: UserTalentTaskRequirement[]
}

export interface TalentTaskMatchContextReader {
  findTalentTaskMatchContext(
    lookup: string,
    organizationId: string | null
  ): Promise<UserTalentTaskMatchContext | null>
}
