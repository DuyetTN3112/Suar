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

export class SearchTasksViaEngineQuery {
  constructor(private readonly repository: TaskSearchStore) {}

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
