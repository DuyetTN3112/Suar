export interface TaskTalentMatchRequirementV1 {
  skillId: string
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

export interface TaskTalentMatchContextV1 {
  taskId: string
  businessDomain: string | null
  problemCategory: string | null
  taskType: string | null
  requiredSkills: TaskTalentMatchRequirementV1[]
}
