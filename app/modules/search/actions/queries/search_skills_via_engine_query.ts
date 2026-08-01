import type { SkillSearchStore } from '#modules/search/actions/ports/outbound/search_projection_store'

export interface SearchSkillsViaEngineDTO {
  q: string
  limit: number
}

export interface EngineSkillCandidate {
  skillId: string
  score: number
}

export class SearchSkillsViaEngineQuery {
  constructor(private readonly repository: SkillSearchStore) {}

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
