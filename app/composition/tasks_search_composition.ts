import { SearchTasksCandidateAdapter } from '#composition/adapters/search_tasks_candidate_adapter'
import { searchEngineCapability } from '#composition/search_engine_composition'
import {
  taskExternalDeps,
} from '#composition/task_external_dependencies_composition'
import { createTaskQueryFactory } from '#composition/task_query_factory'
import GetTasksIndexPageQuery from '#modules/tasks/actions/queries/get_tasks_index_page_query'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import { LucidTaskReadRepository } from '#modules/tasks/infra/adapters/lucid_task_read_repository'
import { taskStatusQueryRepository } from '#modules/tasks/infra/repositories/read/task_status_query_repository'

const taskReadRepository = new LucidTaskReadRepository()

const taskSearchCandidates = new SearchTasksCandidateAdapter(searchEngineCapability)

export const searchAwareTaskExternalDependencies = {
  ...taskExternalDeps,
  organizationTaskSearchCandidates: taskSearchCandidates,
}

const queryFactory = createTaskQueryFactory({
  externalDependencies: searchAwareTaskExternalDependencies,
  publicTaskSearchCandidates: taskSearchCandidates,
})

export const makeGetPublicTasksQuery = (
  execCtx: TaskActionContext
): ReturnType<typeof queryFactory.makeGetPublicTasksQuery> =>
  queryFactory.makeGetPublicTasksQuery(execCtx)

export const makeGetTasksListQuery = (
  execCtx: TaskActionContext
): ReturnType<typeof queryFactory.makeGetTasksListQuery> =>
  queryFactory.makeGetTasksListQuery(execCtx)

export function makeGetTasksIndexPageQuery(
  execCtx: TaskActionContext
): GetTasksIndexPageQuery {
  return new GetTasksIndexPageQuery(
    execCtx,
    searchAwareTaskExternalDependencies,
    taskReadRepository,
    taskStatusQueryRepository
  )
}
