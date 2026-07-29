import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { wrapApiV1Data } from '#modules/http/boundary/api_v1_response'
import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { SprintQueryFactory } from '#modules/sprints/actions/ports/inbound/sprint_query_factory'

@inject()
export default class ListTaskSprintAssignmentHistoryController {
  constructor(private readonly queries: SprintQueryFactory) {}

  async handle(ctx: HttpContext) {
    const outcome = await this.queries.makeHistory(actionContextFromHttp(ctx)).executeAndWrap(
      ctx.params['projectId'] as string,
      ctx.params['taskId'] as string
    )
    const history = outcome.getValue()
    return wrapApiV1Data(history.map((entry) => ({
      id: entry.id,
      organizationId: entry.organization_id,
      projectId: entry.project_id,
      taskId: entry.task_id,
      sprintId: entry.sprint_id,
      enteredAt: entry.entered_at,
      exitedAt: entry.exited_at,
      entryReason: entry.entry_reason,
      exitReason: entry.exit_reason,
      addedAfterStart: entry.added_after_start,
      actorId: entry.actor_id,
      createdAt: entry.created_at,
      current: entry.exited_at === null,
    })))
  }
}
