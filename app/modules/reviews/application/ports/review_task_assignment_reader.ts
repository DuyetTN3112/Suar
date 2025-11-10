export interface ReviewTaskAssignmentSnapshot {
  assignmentId: string
  taskId: string
  projectId: string | null
  organizationId: string
  assigneeUserId: string
  completedAt: string | null
}

export interface ReviewTaskAssignmentReader {
  findCompletedAssignment(assignmentId: string): Promise<ReviewTaskAssignmentSnapshot | null>
}
