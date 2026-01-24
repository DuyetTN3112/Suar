export interface AssignmentDeliveryFactV1 {
  contractVersion: 1
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
