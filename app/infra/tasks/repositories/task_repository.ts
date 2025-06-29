import * as aggregateQueries from './task_repository/aggregate_queries.js'
import * as detailQueries from './task_repository/detail_queries.js'
import * as listQueries from './task_repository/list_queries.js'
import * as publicQueries from './task_repository/public_queries.js'
import * as statisticsQueries from './task_repository/statistics_queries.js'

const TaskRepository = {
  ...aggregateQueries,
  ...detailQueries,
  ...listQueries,
  ...statisticsQueries,
  ...publicQueries,
}

export type { TaskPermissionFilter } from './task_repository/shared.js'

export default TaskRepository
