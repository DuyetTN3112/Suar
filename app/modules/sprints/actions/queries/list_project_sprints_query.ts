import {
  buildPaginationMeta,
  definePaginationPolicy,
  normalizePagination,
  toOffset,
  toCanonicalPagePagination,
} from '#modules/pagination/public_contracts/pagination_public_api'
import type { SprintExternalDependencies } from '#modules/sprints/actions/ports/outbound/sprint_external_dependencies'
import type { SprintRepository } from '#modules/sprints/actions/ports/outbound/sprint_repository'
import type { SprintActionContext } from '#modules/sprints/actions/sprint_action_context'
import { assertCanReadProjectSprints } from '#modules/sprints/domain/project_sprint_access_policy'
import type {
  ListProjectSprintsDTO,
  ListProjectSprintsResult,
} from '#modules/sprints/public_contracts/sprint_public_api'

const SPRINT_PAGINATION = definePaginationPolicy()

export type {
  ListProjectSprintsDTO,
  ListProjectSprintsResult,
} from '#modules/sprints/public_contracts/sprint_public_api'

export default class ListProjectSprintsQuery {
  constructor(
    private readonly execCtx: SprintActionContext,
    private readonly externalDependencies: SprintExternalDependencies,
    private readonly sprints: SprintRepository
  ) {}

  async handle(input: string | ListProjectSprintsDTO): Promise<ListProjectSprintsResult> {
    const dto = typeof input === 'string' ? { projectId: input } : input
    const access = await this.externalDependencies.projectAccess.resolveProjectSprintAccess(
      this.execCtx,
      dto.projectId
    )
    assertCanReadProjectSprints(access)
    const pagination = normalizePagination(dto, SPRINT_PAGINATION, { perPage: 10 })

    const { data, total } = await this.sprints.list(
      dto.projectId,
      toOffset(pagination.page, pagination.perPage),
      pagination.perPage
    )

    return {
      data,
      pagination: toCanonicalPagePagination(buildPaginationMeta(total, pagination)),
    }
  }
}
