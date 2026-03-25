/**
 * ITaskRepository — Domain Repository Interface
 *
 * Defines the contract for task data access.
 * Implementation lives in infra layer.
 * Domain layer only depends on this interface, never on the implementation.
 */

import type { TaskEntity } from '../entities/task_entity.js'
import type { DatabaseId } from '#types/database'

export interface TaskRepository {
  findById(id: DatabaseId): Promise<TaskEntity | null>
  findByOrganization(organizationId: DatabaseId): Promise<TaskEntity[]>
  findByProject(projectId: DatabaseId): Promise<TaskEntity[]>
  findByAssignee(userId: DatabaseId): Promise<TaskEntity[]>
  findByCreator(userId: DatabaseId): Promise<TaskEntity[]>
  findNotDeletedOrFail(id: DatabaseId): Promise<TaskEntity>
}
