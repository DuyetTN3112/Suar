import type { TaskWorkflowTransitionRecord } from '#modules/tasks/types/task_records'

export interface TaskWorkflowQueryRepository {
  findByOrganization(organizationId: string): Promise<TaskWorkflowTransitionRecord[]>
  findByProject?(projectId: string, organizationId?: string): Promise<TaskWorkflowTransitionRecord[]>
}
