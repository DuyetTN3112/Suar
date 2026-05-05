import { projectsSearchComposition } from '#composition/projects/project-search/projects_search_composition'
import type { HttpActionContext } from '#modules/http/public_contracts/http_action_context'
import { ProjectListReader } from '#modules/projects/actions/ports/outbound/project_list_reader'
import type {
  GetProjectsListDTO,
  GetProjectsListResult,
} from '#modules/projects/public_contracts/project_listing'

export class ProjectListReaderAdapter extends ProjectListReader {
  list(input: GetProjectsListDTO, execCtx: HttpActionContext): Promise<GetProjectsListResult> {
    return projectsSearchComposition.listProjects(input, execCtx)
  }
}
