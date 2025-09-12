import type { HttpContext } from '@adonisjs/core/http'

import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import GetApplicationMatchScoreQuery from '#modules/tasks/actions/queries/get_application_match_score_query'
import GetTaskApplicationsRankingQuery from '#modules/tasks/actions/queries/get_task_applications_ranking_query'

export default class MatchScoresController {
  async show(ctx: HttpContext) {
    const { params, response } = ctx
    const query = new GetApplicationMatchScoreQuery(actionContextFromHttp(ctx))
    const result = await query.handle({
      task_id: params.taskId as string,
      application_id: params.applicationId as string,
    })
    response.json(result)
  }

  async ranking(ctx: HttpContext) {
    const { params, response } = ctx
    const query = new GetTaskApplicationsRankingQuery(actionContextFromHttp(ctx))
    const result = await query.handle({
      task_id: params.taskId as string,
    })
    response.json(result)
  }
}
