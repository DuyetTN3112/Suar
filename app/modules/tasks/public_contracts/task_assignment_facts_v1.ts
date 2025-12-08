export interface TaskAssignmentFactsV1 {
  taskId: string
  projectId: string | null
  organizationId: string
  assigneeUserId: string | null
  status: string
  updatedAt: string
}
