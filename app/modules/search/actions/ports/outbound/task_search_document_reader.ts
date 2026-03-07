export interface TaskSearchDocumentSkillRecord {
  skillId: string
  skillName: string
}

export interface TaskSearchDocumentRecord {
  taskId: string
  organizationId: string | null
  title: string
  description: string | null
  acceptanceCriteria: string | null
  contextBackground: string | null
  requiredSkills: TaskSearchDocumentSkillRecord[]
  businessDomain: string | null
  problemCategory: string | null
  taskType: string | null
  difficulty: string | null
  taskVisibility: string
  assignedTo: string | null
  deletedAt: string | null
  updatedAt: string
}

export interface TaskSearchDocumentReader {
  findTaskSearchDocumentRecord(taskId: string): Promise<TaskSearchDocumentRecord>
}
