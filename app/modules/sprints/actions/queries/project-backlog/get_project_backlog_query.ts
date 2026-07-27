import {
  buildPaginationMeta,
  definePaginationPolicy,
  normalizePagination,
  toCanonicalPagePagination,
  toOffset,
} from '#modules/pagination/public_contracts/pagination_public_api'
import { BaseQuery } from '#modules/sprints/actions/base_query'
import type { ProjectBacklogReader } from '#modules/sprints/actions/ports/outbound/project-backlog/project_backlog_reader'
import type { SprintExternalDependencies } from '#modules/sprints/actions/ports/outbound/sprint_external_dependencies'
import type { SprintActionContext } from '#modules/sprints/actions/sprint_action_context'
import { assertCanReadProjectSprints } from '#modules/sprints/domain/project-sprint/project_sprint_access_policy'
import type { GetProjectBacklogDTO, ProjectBacklogResult } from '#modules/sprints/public_contracts/sprint_public_api'

const BACKLOG_PAGINATION = definePaginationPolicy()

export default class GetProjectBacklogQuery extends BaseQuery<
  [GetProjectBacklogDTO],
  ProjectBacklogResult
> {
  constructor(
    private readonly ctx: SprintActionContext,
    private readonly dependencies: SprintExternalDependencies,
    private readonly reader: ProjectBacklogReader
  ) {
    super()
  }

  async handle(dto: GetProjectBacklogDTO): Promise<ProjectBacklogResult> {
    const access = await this.dependencies.projectAccess.resolveProjectSprintAccess(this.ctx, dto.project_id)
    assertCanReadProjectSprints(access)
    const pagination = normalizePagination(dto, BACKLOG_PAGINATION, { perPage: 25 })
    const result = await this.reader.list(dto.project_id, toOffset(pagination.page, pagination.perPage), pagination.perPage, dto.status)
    return {
      project_id: dto.project_id,
      tasks: result.tasks,
      counts: { total: result.total },
      pagination: toCanonicalPagePagination(buildPaginationMeta(result.total, pagination)),
    }
  }

  async execute(dto: GetProjectBacklogDTO): Promise<ProjectBacklogResult> {
    return this.handle(dto)
  }
}
