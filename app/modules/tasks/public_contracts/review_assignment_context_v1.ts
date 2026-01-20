export interface ReviewAssignmentContextTaskV1 {
  id: string
  title: string
  description: string
  status: string
  priority: string
  difficulty: string | null
  dueDate: string | null
  projectId: string | null
  organizationId: string
}

/**
 * Tasks-owned versioned read projection for review workflows.
 *
 * Consumers receive only scalar assignment/task facts and must not depend on
 * Tasks persistence models or Lucid relation serialization.
 */
export interface ReviewAssignmentContextV1 {
  contractVersion: 1
  id: string
  taskId: string
  assigneeId: string
  assignmentStatus: 'active' | 'completed' | 'cancelled'
  estimatedHours: number | null
  actualHours: number | null
  completionNotes: string | null
  task: ReviewAssignmentContextTaskV1
}
