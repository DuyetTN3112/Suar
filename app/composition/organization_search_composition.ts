import {
  SearchOrganizationCandidateReader,
  SearchOrganizationMemberCandidateReader,
  SearchOrganizationProjectCandidateReader,
} from './adapters/search_organization_candidate_readers.js'
import {
  organizationMembershipRepository,
  organizationReader,
} from './organization_persistence_composition.js'
import { organizationUserReaderWriter } from './organization_user_composition.js'
import { searchEngineCapability } from './search_engine_composition.js'

import GetAllOrganizationsQuery from '#modules/organizations/directory/actions/query/get_all_organizations_query'
import type { OrganizationDirectoryCapability } from '#modules/organizations/directory/public_contracts/organization_directory'
import GetOrganizationMembersApiQuery from '#modules/organizations/members/actions/query/get_organization_members_api_query'

export const organizationSearchCandidateReader = new SearchOrganizationCandidateReader(
  searchEngineCapability
)
export const organizationMemberSearchCandidateReader =
  new SearchOrganizationMemberCandidateReader(searchEngineCapability)
export const organizationProjectSearchCandidateReader =
  new SearchOrganizationProjectCandidateReader(searchEngineCapability)

const organizationDirectoryQuery = new GetAllOrganizationsQuery(
  organizationUserReaderWriter,
  organizationReader,
  organizationMembershipRepository,
  { searchCandidateReader: organizationSearchCandidateReader }
)

export const organizationDirectoryCapability: OrganizationDirectoryCapability = {
  searchBasicList: (query, limit) => organizationDirectoryQuery.searchBasicList(query, limit),
  getMembershipDirectoryPage: (input) =>
    organizationDirectoryQuery.getWithMembershipStatusPage(input),
}

export function getOrganizationMembersApi(rawId: string, rawQuery?: string) {
  return new GetOrganizationMembersApiQuery(
    organizationReader,
    organizationMembershipRepository,
    {
      searchCandidateReader: organizationMemberSearchCandidateReader,
    }
  ).execute(rawId, rawQuery)
}
