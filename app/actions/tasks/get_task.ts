import Task from '#models/task'
import { inject } from '@adonisjs/core'
import { HttpContext } from '@adonisjs/core/http'

@inject()
export default class GetTask {
  constructor(protected ctx: HttpContext) {}

  async handle({ id }: { id: string }) {
    const task = await Task.query()
      .where('id', id)
      .whereNull('deleted_at')
      .preload('status')
      .preload('label')
      .preload('priority')
      .preload('assignee', (query) => {
        query.select(['id', 'first_name', 'last_name', 'full_name'])
      })
      .preload('creator', (query) => {
        query.select(['id', 'first_name', 'last_name', 'full_name'])
      })
      .preload('parentTask', (query) => {
        query.select(['id', 'title'])
      })
      .preload('childTasks', (query) => {
        query.whereNull('deleted_at')
        query.select(['id', 'title', 'status_id', 'parent_task_id'])
        query.preload('status')
      })
      .preload('versions', (query) => {
        query.orderBy('changed_at', 'desc')
      })
      .firstOrFail()

    return task
  }
}
