import { TaskSearchIndexRepository } from '#modules/search/infra/tasks/task_search_index_repository'

export interface SearchTasksViaEngineDTO {
  q: string
  organizationId: string
  limit: number
}

export interface EngineOrganizationTaskCandidate {
  taskId: string
  score: number
}

export class SearchTasksViaEngineQuery {
  constructor(
    private readonly repository: TaskSearchIndexRepository = new TaskSearchIndexRepository()
  ) {}

  async handle(dto: SearchTasksViaEngineDTO): Promise<EngineOrganizationTaskCandidate[]> {
    const q = dto.q.trim()
    if (!q) {
      return []
    }

    return this.repository.search({
      q,
      organizationId: dto.organizationId,
      limit: dto.limit,
      publicOnly: false,
    })
  }
}
