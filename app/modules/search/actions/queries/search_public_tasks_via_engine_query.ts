import type { TaskSearchStore } from '#modules/search/actions/ports/outbound/search_projection_store'

export interface SearchPublicTasksViaEngineDTO {
  q: string
  limit: number
}

export interface EngineTaskCandidate {
  taskId: string
  score: number
}

export class SearchPublicTasksViaEngineQuery {
  constructor(private readonly repository: TaskSearchStore) {}

  async handle(dto: SearchPublicTasksViaEngineDTO): Promise<EngineTaskCandidate[]> {
    const q = dto.q.trim()
    if (!q) {
      return []
    }

    return this.repository.search({
      q,
      limit: dto.limit,
      publicOnly: true,
    })
  }
}
