import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import type GetTasksGroupedQuery from '#modules/tasks/actions/queries/get_tasks_grouped_query'
import type GetTasksIndexPageQuery from '#modules/tasks/actions/queries/get_tasks_index_page_query'
import type GetTasksTimelineQuery from '#modules/tasks/actions/queries/get_tasks_timeline_query'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'

export class TaskBoardQueryFactory {
  makeIndexPage(_context: TaskActionContext): GetTasksIndexPageQuery {
    throw new InvariantViolationException(
      'TaskBoardQueryFactory is an inbound token and must be composed'
    )
  }

  makeGrouped(_context: TaskActionContext): GetTasksGroupedQuery {
    throw new InvariantViolationException(
      'TaskBoardQueryFactory is an inbound token and must be composed'
    )
  }

  makeTimeline(_context: TaskActionContext): GetTasksTimelineQuery {
    throw new InvariantViolationException(
      'TaskBoardQueryFactory is an inbound token and must be composed'
    )
  }
}
