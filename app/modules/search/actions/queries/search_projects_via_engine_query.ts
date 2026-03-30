import { ProjectSearchIndexRepository } from '#modules/search/infra/projects/project_search_index_repository'

export interface SearchProjectsViaEngineDTO {
  q: string
  limit: number
}

export interface EngineProjectCandidate {
  projectId: string
  score: number
}

export class SearchProjectsViaEngineQuery {
  constructor(
    private readonly repository: ProjectSearchIndexRepository = new ProjectSearchIndexRepository()
  ) {}

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
