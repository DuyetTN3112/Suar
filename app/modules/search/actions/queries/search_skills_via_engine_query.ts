import { SkillSearchIndexRepository } from '#modules/search/infra/skills/skill_search_index_repository'

export interface SearchSkillsViaEngineDTO {
  q: string
  limit: number
}

export interface EngineSkillCandidate {
  skillId: string
  score: number
}

export class SearchSkillsViaEngineQuery {
  constructor(
    private readonly repository: SkillSearchIndexRepository = new SkillSearchIndexRepository()
  ) {}

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
