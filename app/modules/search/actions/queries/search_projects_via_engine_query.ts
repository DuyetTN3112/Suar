import type { ProjectSearchStore } from '#modules/search/actions/ports/outbound/search_projection_store'

export interface SearchProjectsViaEngineDTO {
  q: string
  limit: number
}

export interface EngineProjectCandidate {
  projectId: string
  score: number
}

export class SearchProjectsViaEngineQuery {
  constructor(private readonly repository: ProjectSearchStore) {}

  async handle(dto: SearchProjectsViaEngineDTO): Promise<EngineProjectCandidate[]> {
    const q = dto.q.trim()
    if (!q) {
      return []
    }

    return this.repository.search({
      q,
      limit: dto.limit,
    })
  }
}
