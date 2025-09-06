
export interface TaskCreatedEvent {
  taskId: string
  creatorId: string
  organizationId: string
  projectId: string | null
}

export interface TaskFieldChange {
  field: string
  oldValue: unknown
  newValue: unknown
}

export interface TaskUpdatedEvent {
  taskId: string
  updatedBy: string
  changes: Record<string, unknown> | TaskFieldChange[]
  previousValues: Record<string, unknown>
}

export interface TaskStatusChangedEvent {
  taskId: string
  assignedTo: string | null
  oldStatus: string
  newStatusId: string
  newStatus: string
  newStatusCategory: string
  changedBy: string
}

export interface TaskAssignmentCompletedEvent {
  taskId: string
  assignmentId: string
  assigneeId: string
}

export interface TaskAssignedEvent {
  taskId: string
  assigneeId: string
  assignedBy: string
  assignmentType: string
}

export interface TaskAccessRevokedEvent {
  taskId: string
  userId: string
  revokedBy: string
  reason?: string
}

export interface TaskApplicationSubmittedEvent {
  applicationId: string
  taskId: string
  applicantId: string
  projectId: string
  ownerId: string
}

export interface TaskApplicationReviewedEvent {
  applicationId: string
  taskId: string
  applicantId: string
  reviewedBy: string
  status: string
}

declare module '@adonisjs/core/types' {
  interface EventsList {
    'task:created': TaskCreatedEvent
    'task:updated': TaskUpdatedEvent
    'task:status:changed': TaskStatusChangedEvent
    'task:assignment:completed': TaskAssignmentCompletedEvent
    'task:assigned': TaskAssignedEvent
    'task:access:revoked': TaskAccessRevokedEvent
    'task:application:submitted': TaskApplicationSubmittedEvent
    'task:application:reviewed': TaskApplicationReviewedEvent
  }
}
