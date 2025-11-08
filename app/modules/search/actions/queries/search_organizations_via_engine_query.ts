import { OrganizationSearchIndexRepository } from '#modules/search/infra/organizations/organization_search_index_repository'

export interface SearchOrganizationsViaEngineDTO {
  q: string
  limit: number
}

export interface EngineOrganizationCandidate {
  organizationId: string
  score: number
}

export class SearchOrganizationsViaEngineQuery {
  constructor(
    private readonly repository: OrganizationSearchIndexRepository = new OrganizationSearchIndexRepository()
  ) {}

  async handle(dto: SearchOrganizationsViaEngineDTO): Promise<EngineOrganizationCandidate[]> {
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
