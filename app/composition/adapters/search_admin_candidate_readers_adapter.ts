import {
  AdminOrganizationSearchCandidateReader,
  type AdminOrganizationSearchCandidate,
  type AdminOrganizationSearchCandidatesInput,
} from '#modules/admin/organizations/actions/ports/outbound/admin_search_candidate_readers'
import {
  AdminUserSearchCandidateReader,
  type AdminUserSearchCandidate,
  type AdminUserSearchCandidatesInput,
} from '#modules/admin/users/actions/ports/outbound/admin_search_candidate_readers'
import type { SearchEngineCapability } from '#modules/search/public_contracts/search_engine'

export class SearchAdminUserCandidateReaderAdapter extends AdminUserSearchCandidateReader {
  constructor(private readonly searchEngine: SearchEngineCapability) {
    super()
  }

  isEnabled(): boolean {
    return this.searchEngine.isEnabled()
  }

  async searchUserCandidates(
    input: AdminUserSearchCandidatesInput
  ): Promise<AdminUserSearchCandidate[]> {
    const candidates = await this.searchEngine.searchUsers({
      q: input.q,
      limit: input.limit,
    })

    return candidates.map((candidate) => ({
      userId: candidate.userId,
      score: candidate.score,
    }))
  }
}

export class SearchAdminOrganizationCandidateReaderAdapter
  extends AdminOrganizationSearchCandidateReader
{
  constructor(private readonly searchEngine: SearchEngineCapability) {
    super()
  }

  isEnabled(): boolean {
    return this.searchEngine.isEnabled()
  }

  async searchOrganizationCandidates(
    input: AdminOrganizationSearchCandidatesInput
  ): Promise<AdminOrganizationSearchCandidate[]> {
    const candidates = await this.searchEngine.searchOrganizations({
      q: input.q,
      limit: input.limit,
    })

    return candidates.map((candidate) => ({
      organizationId: candidate.organizationId,
      score: candidate.score,
    }))
  }
}
