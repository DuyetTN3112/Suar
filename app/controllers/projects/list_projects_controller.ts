import type { HttpContext } from '@adonisjs/core/http'
import GetProjectsListQuery from '#actions/projects/queries/get_projects_list_query'
import type { GetProjectsListDTO } from '#actions/projects/queries/get_projects_list_query'
import { ProjectVisibility } from '#constants/project_constants'

/**
 * GET /projects → List projects
 */
export default class ListProjectsController {
  async handle(ctx: HttpContext) {
    const { inertia, session, request } = ctx
    const dto = this.buildListDTO(request)
    const query = new GetProjectsListQuery(ctx)
    const result = await query.handle(dto)
    const showOrganizationRequiredModal = session.has('show_organization_required_modal')

    return await inertia.render('projects/index', {
      projects: result.data,
      pagination: result.pagination,
      filters: result.filters,
      stats: result.stats,
      showOrganizationRequiredModal,
    })
  }

  private buildListDTO(request: HttpContext['request']): GetProjectsListDTO {
    const visibilityInput = request.input('visibility') as string | undefined
    const sortByInput = (request.input('sort_by', 'created_at') ?? 'created_at') as string

    const validVisibilities = Object.values(ProjectVisibility) as string[]
    const visibility: ProjectVisibility | undefined = validVisibilities.includes(
      visibilityInput as string
    )
      ? (visibilityInput as ProjectVisibility)
      : undefined

    const validSortBy = ['created_at', 'name', 'start_date', 'end_date'] as const
    type SortByType = (typeof validSortBy)[number]
    const sortBy: SortByType = validSortBy.includes(sortByInput as SortByType)
      ? (sortByInput as SortByType)
      : 'created_at'

    return {
      page: Number(request.input('page', 1)),
      limit: Number(request.input('limit', 20)),
      organization_id: request.input('organization_id') as string | undefined,
      status: request.input('status') as string | undefined,
      creator_id: request.input('creator_id') as string | undefined,
      manager_id: request.input('manager_id') as string | undefined,
      visibility,
      search: request.input('search') as string | undefined,
      sort_by: sortBy,
      sort_order: (request.input('sort_order', 'desc') ?? 'desc') as 'asc' | 'desc',
    }
  }
}
