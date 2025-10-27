import { TalentSearchIndexRepository } from '#modules/search/infra/talents/talent_search_index_repository'

export interface SearchTalentsViaEngineDTO {
  q: string
  limit: number
}

export interface EngineTalentCandidate {
  userId: string
  score: number
}

export class SearchTalentsViaEngineQuery {
  constructor(
    private readonly repository: TalentSearchIndexRepository = new TalentSearchIndexRepository()
  ) {}

  async handle(dto: SearchTalentsViaEngineDTO): Promise<EngineTalentCandidate[]> {
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
