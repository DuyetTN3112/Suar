import type { TaskApplication } from '../../domain/task_application.js'

export interface TaskApplicationRepository {
  save(application: TaskApplication): Promise<void>
  findById(id: string): Promise<TaskApplication | null>
  findByTaskId(taskId: string): Promise<TaskApplication[]>
  findByTaskAndApplicant(taskId: string, applicantId: string): Promise<TaskApplication | null>
}
