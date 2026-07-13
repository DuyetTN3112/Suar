import { BaseQuery } from '#modules/search/actions/base_query'
import type { TaskSearchStore } from '#modules/search/actions/ports/outbound/search_projection_store'

export interface SearchTasksViaEngineDTO {
  q: string
  organizationId: string
  limit: number
}

export interface EngineOrganizationTaskCandidate {
  taskId: string
  score: number
}

export class SearchTasksViaEngineQuery extends BaseQuery<
  SearchTasksViaEngineDTO,
  EngineOrganizationTaskCandidate[]
> {
  constructor(private readonly repository: TaskSearchStore) {
    super()
  }

  async handle(dto: SearchTasksViaEngineDTO): Promise<EngineOrganizationTaskCandidate[]> {
    const q = dto.q.trim()
    if (!q) {
      return []
    }

    return this.repository.search({
      q,
      organizationId: dto.organizationId,
      limit: dto.limit,
      publicOnly: false,
    })
  }
}
