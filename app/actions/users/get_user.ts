import User from '#models/user'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

@inject()
export default class GetUser {
  constructor(protected ctx: HttpContext) {}

  async handle({ id }: { id: number }) {
    const user = await User.query()
      .where('id', id)
      .whereNull('deleted_at')
      .preload('role')
      .preload('status')
      .preload('user_detail')
      .preload('user_profile')
      .preload('user_urls')
      .preload('user_setting')
      .preload('assigned_tasks', (query: any) => {
        query
          .whereNull('deleted_at')
          .preload('status')
          .preload('label')
          .preload('priority')
          .orderBy('due_date', 'asc')
          .limit(5)
      })
      .preload('created_tasks', (query: any) => {
        query
          .whereNull('deleted_at')
          .preload('status')
          .preload('label')
          .preload('priority')
          .orderBy('due_date', 'asc')
          .limit(5)
      })
      .preload('user_apps', (query: any) => {
        query.preload('app', (appQuery: any) => {
          appQuery.select(['id', 'name', 'logo', 'description'])
        })
      })
      .firstOrFail()

    return user
  }
}
