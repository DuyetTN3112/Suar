import type { TaskTransaction } from '#modules/tasks/actions/ports/outbound/task_transaction'
import type { TaskStatusRecord } from '#modules/tasks/types/task_records'

export interface TaskStatusQueryRepositoryPort {
  findByIdAndOrgActive(
    statusId: string,
    organizationId: string,
    trx?: TaskTransaction,
    projectId?: string
  ): Promise<TaskStatusRecord | null>

  findByOrganization(organizationId: string): Promise<TaskStatusRecord[]>

  findByProject?(projectId: string, organizationId?: string): Promise<TaskStatusRecord[]>
}
