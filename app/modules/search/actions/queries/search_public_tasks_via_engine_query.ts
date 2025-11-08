import { TaskSearchIndexRepository } from '#modules/search/infra/tasks/task_search_index_repository'

export interface SearchPublicTasksViaEngineDTO {
  q: string
  limit: number
}

export interface EngineTaskCandidate {
  taskId: string
  score: number
}

export class SearchPublicTasksViaEngineQuery {
  constructor(
    private readonly repository: TaskSearchIndexRepository = new TaskSearchIndexRepository()
  ) {}

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
