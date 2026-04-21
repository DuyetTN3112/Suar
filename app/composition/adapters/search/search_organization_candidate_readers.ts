import type { OrganizationSearchCandidateReader } from '#modules/organizations/actions/ports/outbound/directory/organization_search_candidate_reader'
import type { OrganizationMemberSearchCandidateReader } from '#modules/organizations/actions/ports/outbound/members/organization_member_search_candidate_reader'
import type { OrganizationProjectSearchCandidateReader } from '#modules/organizations/actions/ports/outbound/projects/organization_project_search_candidate_reader'
import type { SearchEngineCapability } from '#modules/search/public_contracts/search_engine'

export class SearchOrganizationCandidateReader implements OrganizationSearchCandidateReader {
  constructor(private readonly search: SearchEngineCapability) {}

  isEnabled(): boolean {
    return this.search.isEnabled()
  }

  searchOrganizationCandidates(input: { q: string; limit: number }) {
    return this.search.searchOrganizations(input)
  }
}

export class SearchOrganizationMemberCandidateReader
  implements OrganizationMemberSearchCandidateReader
{
  constructor(private readonly search: SearchEngineCapability) {}

  isEnabled(): boolean {
    return this.search.isEnabled()
  }

  searchUserCandidates(input: { q: string; limit: number }) {
    return this.search.searchUsers(input)
  }
}

export class SearchOrganizationProjectCandidateReader
  implements OrganizationProjectSearchCandidateReader
{
  constructor(private readonly search: SearchEngineCapability) {}

  isEnabled(): boolean {
    return this.search.isEnabled()
  }

  searchProjectCandidates(input: { q: string; limit: number }) {
    return this.search.searchProjects(input)
  }
}
