import { ProjectTaskStatsReaderAdapter } from '#composition/adapters/projects/project_task_stats_reader_adapter'
import { SearchProjectsCandidateReaderAdapter } from '#composition/adapters/search/search_projects_candidate_reader_adapter'
import {
  projectListRepository,
  projectMembershipRepository,
} from '#composition/projects/project-membership/project_persistence_composition'
import { searchEngineCapability } from '#composition/search/search-engine/search_engine_composition'
import type { HttpActionContext } from '#modules/http/public_contracts/http_action_context'
import GetProjectsListQuery from '#modules/projects/actions/queries/project-context/get_projects_list_query'
import type {
  GetProjectsListDTO,
  GetProjectsListResult,
} from '#modules/projects/public_contracts/project_listing'

const searchCandidates = new SearchProjectsCandidateReaderAdapter(searchEngineCapability)
const taskStats = new ProjectTaskStatsReaderAdapter()

export interface ProjectsSearchCapability {
  listProjects(
    input: GetProjectsListDTO,
    execCtx: HttpActionContext
  ): Promise<GetProjectsListResult>
}

export const projectsSearchComposition: ProjectsSearchCapability = {
  listProjects(input, execCtx) {
    return new GetProjectsListQuery(
      execCtx,
      taskStats,
      projectListRepository,
      projectMembershipRepository,
      searchCandidates
    ).handle(input)
  },
}
