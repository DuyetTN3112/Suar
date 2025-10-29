import type { TaskSearchSyncReader } from '#modules/tasks/application/ports/task_search_sync_reader'
import Task from '#modules/tasks/infra/models/task'

export class LucidTaskSearchSyncReader implements TaskSearchSyncReader {
  async listNotDeletedTaskIds(): Promise<string[]> {
    const tasks = await Task.query().whereNull('deleted_at').select(['id'])
    return tasks.map((task) => task.id)
  }
}
