import { UserDirectorySearchIndexRepository } from '#modules/search/infra/users/user_directory_search_index_repository'

export interface SearchUsersViaEngineDTO {
  q: string
  limit: number
}

export interface EngineUserCandidate {
  userId: string
  score: number
}

export class SearchUsersViaEngineQuery {
  constructor(
    private readonly repository: UserDirectorySearchIndexRepository = new UserDirectorySearchIndexRepository()
  ) {}

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
