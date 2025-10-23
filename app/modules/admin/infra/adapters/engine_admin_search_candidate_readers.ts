import type {
  AdminOrganizationSearchCandidate,
  AdminOrganizationSearchCandidateReader,
  AdminOrganizationSearchCandidatesInput,
  AdminUserSearchCandidate,
  AdminUserSearchCandidateReader,
  AdminUserSearchCandidatesInput,
} from '#modules/admin/actions/ports/admin_search_candidate_readers'
import {
  searchOrganizationsViaEngine,
  searchUsersViaEngine,
} from '#modules/search/public_contracts/search_engine'

export class EngineAdminUserSearchCandidateReader implements AdminUserSearchCandidateReader {
  async searchUserCandidates(
    input: AdminUserSearchCandidatesInput
  ): Promise<AdminUserSearchCandidate[]> {
    return searchUsersViaEngine(input)
  }
}

export class EngineAdminOrganizationSearchCandidateReader
  implements AdminOrganizationSearchCandidateReader
{
  async searchOrganizationCandidates(
    input: AdminOrganizationSearchCandidatesInput
  ): Promise<AdminOrganizationSearchCandidate[]> {
    return searchOrganizationsViaEngine(input)
  }
}
