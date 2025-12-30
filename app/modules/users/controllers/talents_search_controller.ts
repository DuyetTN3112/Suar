import type { HttpContext } from '@adonisjs/core/http'

import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import SearchTalentsQuery from '#modules/users/actions/queries/search_talents_query'

export default class TalentsSearchController {
  async handle(ctx: HttpContext) {
    const { request, response } = ctx
    const q = request.input('q') as unknown
    const taskId = request.input('task_id') as unknown

    const query = new SearchTalentsQuery(actionContextFromHttp(ctx))
    const result = await query.handle({
      q: typeof q === 'string' ? q : undefined,
      task_id: typeof taskId === 'string' ? taskId : undefined,
    })

    response.json(result);
  }
}
