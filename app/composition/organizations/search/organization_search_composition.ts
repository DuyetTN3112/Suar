import {
  SearchOrganizationCandidateReader,
  SearchOrganizationMemberCandidateReader,
  SearchOrganizationProjectCandidateReader,
} from '../../adapters/search/search_organization_candidate_readers.js'
import {
  organizationMembershipRepository,
  organizationReader,
} from '../persistence/organization_persistence_composition.js'
import { organizationUserReaderWriter } from '../directory/organization_user_composition.js'
import { searchEngineCapability } from '#composition/search/search-engine/search_engine_composition'

import GetAllOrganizationsQuery from '#modules/organizations/actions/queries/directory/get_all_organizations_query'
import type { OrganizationDirectoryCapability } from '#modules/organizations/public_contracts/directory/organization_directory'
import GetOrganizationMembersApiQuery from '#modules/organizations/actions/queries/members/get_organization_members_api_query'

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
