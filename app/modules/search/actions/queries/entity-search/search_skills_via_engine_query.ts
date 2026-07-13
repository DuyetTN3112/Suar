import { BaseQuery } from '#modules/search/actions/base_query'
import type { SkillSearchStore } from '#modules/search/actions/ports/outbound/search_projection_store'

export interface SearchSkillsViaEngineDTO {
  q: string
  limit: number
}

export interface EngineSkillCandidate {
  skillId: string
  score: number
}

export class SearchSkillsViaEngineQuery extends BaseQuery<
  SearchSkillsViaEngineDTO,
  EngineSkillCandidate[]
> {
  constructor(private readonly repository: SkillSearchStore) {
    super()
  }

  async handle(dto: SearchSkillsViaEngineDTO): Promise<EngineSkillCandidate[]> {
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
