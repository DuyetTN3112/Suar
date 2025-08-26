/**
 * ITaskRepository — Domain Repository Interface
 *
 * Defines the contract for task data access.
 * Implementation lives in infra layer.
 * Domain layer only depends on this interface, never on the implementation.
 */

import type { TaskEntity } from '../entities/task_entity.js'


export interface TaskRepository {
  findById(id: string): Promise<TaskEntity | null>
  findByOrganization(organizationId: string): Promise<TaskEntity[]>
  findByProject(projectId: string): Promise<TaskEntity[]>
  findByAssignee(userId: string): Promise<TaskEntity[]>
  findByCreator(userId: string): Promise<TaskEntity[]>
  findNotDeletedOrFail(id: string): Promise<TaskEntity>
}
