import { BaseQuery } from '#modules/search/actions/base_query'
import type { TalentSearchStore } from '#modules/search/actions/ports/outbound/search_projection_store'

export interface SearchTalentsViaEngineDTO {
  q: string
  limit: number
}

export interface EngineTalentCandidate {
  userId: string
  score: number
}

export class SearchTalentsViaEngineQuery extends BaseQuery<
  SearchTalentsViaEngineDTO,
  EngineTalentCandidate[]
> {
  constructor(private readonly repository: TalentSearchStore) {
    super()
  }

  async handle(
    dto: SearchTalentsViaEngineDTO,
    signal?: AbortSignal
  ): Promise<EngineTalentCandidate[]> {
    const q = dto.q.trim()
    if (!q) {
      return []
    }

    return this.repository.search({
      q,
      limit: dto.limit,
    }, signal)
  }
}
