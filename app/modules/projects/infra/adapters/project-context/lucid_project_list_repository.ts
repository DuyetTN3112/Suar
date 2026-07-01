import type {
  ProjectAccessListFilters,
  ProjectListRecord,
  ProjectListRepository,
} from '#modules/projects/actions/ports/outbound/project_list_repository'
import * as accessQueries from '#modules/projects/infra/repositories/project-context/read/access_queries'

export class LucidProjectListRepository implements ProjectListRepository {
  async paginateByUserAccess(
    userId: string,
    filters: ProjectAccessListFilters
  ): Promise<{ data: ProjectListRecord[]; total: number }> {
    const result = await accessQueries.paginateByUserAccess(userId, filters)
    return {
      data: result.data as unknown as ProjectListRecord[],
      total: result.total,
    }
  }

  getStatsByUserAccess(
    userId: string,
    filters: { organization_id?: string }
  ) {
    return accessQueries.getStatsByUserAccess(userId, filters)
  }
}
