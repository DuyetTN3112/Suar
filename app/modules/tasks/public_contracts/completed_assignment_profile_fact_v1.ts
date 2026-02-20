export interface CompletedAssignmentProfileFactV1 {
  contractVersion: 1
  taskAssignmentId: string
  taskId: string
  organizationId: string
  projectId: string | null
  taskTitle: string
  taskType: string | null
  businessDomain: string | null
  problemCategory: string | null
  roleInTask: string | null
  autonomyLevel: string | null
  collaborationType: string | null
  techStack: string[]
  domainTags: string[]
  difficulty: string | null
  estimatedTime: number | null
  actualTime: number | null
  assignmentEstimatedHours: number | null
  assignmentActualHours: number | null
  dueDate: string | null
  completedAt: string | null
  measurableOutcomes: Record<string, unknown>[]
  impactScope: string | null
}
