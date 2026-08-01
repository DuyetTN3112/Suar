import type { OrganizationSearchStore } from '#modules/search/actions/ports/outbound/search_projection_store'

export interface SearchOrganizationsViaEngineDTO {
  q: string
  limit: number
}

export interface EngineOrganizationCandidate {
  organizationId: string
  score: number
}

export class SearchOrganizationsViaEngineQuery {
  constructor(private readonly repository: OrganizationSearchStore) {}

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
