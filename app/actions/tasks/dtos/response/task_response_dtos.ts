/**
 * Task Response DTOs
 *
 * Data Transfer Objects for API responses.
 * These are what gets sent back to the client.
 */

/**
 * TaskDetailResponseDTO — Full task detail for detail views
 */
export class TaskDetailResponseDTO {
  constructor(
    public readonly id: string,
    public readonly title: string,
    public readonly description: string,
    public readonly status: string,
    public readonly taskStatusId: string | null,
    public readonly label: string,
    public readonly priority: string,
    public readonly difficulty: string | null,
    public readonly assignedTo: string | null,
    public readonly creatorId: string,
    public readonly updatedBy: string | null,
    public readonly dueDate: Date | null,
    public readonly parentTaskId: string | null,
    public readonly estimatedTime: number,
    public readonly actualTime: number,
    public readonly organizationId: string,
    public readonly projectId: string | null,
    public readonly taskVisibility: string,
    public readonly applicationDeadline: Date | null,
    public readonly estimatedBudget: number | null,
    public readonly externalApplicationsCount: number,
    public readonly sortOrder: number,
    public readonly createdAt: Date,
    public readonly updatedAt: Date
  ) {}
}

/**
 * TaskListItemResponseDTO — Compact task info for list views
 */
export class TaskListItemResponseDTO {
  constructor(
    public readonly id: string,
    public readonly title: string,
    public readonly status: string,
    public readonly label: string,
    public readonly priority: string,
    public readonly difficulty: string | null,
    public readonly assignedTo: string | null,
    public readonly dueDate: Date | null,
    public readonly organizationId: string,
    public readonly projectId: string | null,
    public readonly sortOrder: number,
    public readonly createdAt: Date
  ) {}
}

/**
 * TaskSummaryResponseDTO — Minimal task info (for references in other entities)
 */
export class TaskSummaryResponseDTO {
  constructor(
    public readonly id: string,
    public readonly title: string,
    public readonly status: string,
    public readonly priority: string
  ) {}
}
