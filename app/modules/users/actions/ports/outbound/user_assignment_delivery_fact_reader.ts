export interface UserAssignmentDeliveryFact {
  assignmentId: string
  taskId: string
  assigneeId: string
  assignmentStatus: 'active' | 'completed' | 'cancelled'
  estimatedHours: number | null
  actualHours: number | null
  assignedAt: string
  completedAt: string | null
  taskDueDate: string | null
}

export interface UserAssignmentDeliveryFactReader {
  listAssignmentDeliveryFacts(userId: string): Promise<UserAssignmentDeliveryFact[]>
}
