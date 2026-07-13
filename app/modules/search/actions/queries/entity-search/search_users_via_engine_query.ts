import { BaseQuery } from '#modules/search/actions/base_query'
import type { UserDirectorySearchStore } from '#modules/search/actions/ports/outbound/search_projection_store'

export interface SearchUsersViaEngineDTO {
  q: string
  limit: number
}

export interface EngineUserCandidate {
  userId: string
  score: number
}

export class SearchUsersViaEngineQuery extends BaseQuery<
  SearchUsersViaEngineDTO,
  EngineUserCandidate[]
> {
  constructor(private readonly repository: UserDirectorySearchStore) {
    super()
  }

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
