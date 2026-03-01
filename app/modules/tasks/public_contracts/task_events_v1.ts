export interface TaskAssignedV1 {
  eventType: 'tasks.assigned.v1'
  taskId: string
  projectId: string | null
  organizationId: string
  assigneeUserId: string
  assignedByUserId: string
  assignedAt: string
}

export interface TaskUnassignedV1 {
  eventType: 'tasks.unassigned.v1'
  taskId: string
  projectId: string | null
  organizationId: string
  assigneeUserId: string
  unassignedByUserId: string
  unassignedAt: string
}

export interface TaskStatusChangedV1 {
  eventType: 'tasks.status_changed.v1'
  taskId: string
  projectId: string | null
  organizationId: string
  oldStatus: string
  newStatus: string
  changedByUserId: string
  changedAt: string
}

export interface TaskAssignmentCompletedV1 {
  eventType: 'tasks.assignment_completed.v1'
  assignmentId: string
  taskId: string
  projectId: string | null
  organizationId: string
  assigneeUserId: string
  reviewerUserId: string | null
  completedAt: string
}
