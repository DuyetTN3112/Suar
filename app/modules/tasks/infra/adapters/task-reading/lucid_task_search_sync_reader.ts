import Task from '#modules/tasks/infra/models/task-authoring/task'

export class LucidTaskSearchSyncReader {
  async listNotDeletedTaskIds(): Promise<string[]> {
    const tasks = await Task.query().whereNull('deleted_at').select(['id'])
    return tasks.map((task) => task.id)
  }
}
