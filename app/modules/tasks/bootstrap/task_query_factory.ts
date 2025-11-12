import type { TaskExternalDependencies } from '#modules/tasks/actions/ports/task_external_dependencies'
import GetPublicTasksQuery from '#modules/tasks/actions/queries/get_public_tasks_query'
import GetTasksListQuery from '#modules/tasks/actions/queries/get_tasks_list_query'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import { taskExternalDeps } from '#modules/tasks/bootstrap/task_composition_root'
import {
  EngineOrganizationTaskSearchCandidateReader,
  EnginePublicTaskSearchCandidateReader,
} from '#modules/tasks/infra/adapters/engine_task_search_candidate_readers'

export function makeGetPublicTasksQuery(execCtx: TaskActionContext): GetPublicTasksQuery {
  return new GetPublicTasksQuery(execCtx, {
    searchCandidateReader: new EnginePublicTaskSearchCandidateReader(),
  })
}

export function makeGetTasksListQuery(
  execCtx: TaskActionContext,
  externalDependencies: TaskExternalDependencies = taskExternalDeps
): GetTasksListQuery {
  return new GetTasksListQuery(execCtx, externalDependencies, {
    searchCandidateReader: new EngineOrganizationTaskSearchCandidateReader(),
  })
}
