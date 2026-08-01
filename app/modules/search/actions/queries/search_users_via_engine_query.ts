import type { UserDirectorySearchStore } from '#modules/search/actions/ports/outbound/search_projection_store'

export interface SearchUsersViaEngineDTO {
  q: string
  limit: number
}

export interface EngineUserCandidate {
  userId: string
  score: number
}

export class SearchUsersViaEngineQuery {
  constructor(private readonly repository: UserDirectorySearchStore) {}

  async handle(dto: SearchUsersViaEngineDTO): Promise<EngineUserCandidate[]> {
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
