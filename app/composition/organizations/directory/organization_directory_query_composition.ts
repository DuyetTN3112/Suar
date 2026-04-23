import {
  organizationMembershipRepository,
  organizationReader,
} from '../persistence/organization_persistence_composition.js'

import GetUserOwnedOrganizationsQuery from '#modules/organizations/actions/queries/directory/get_user_owned_organizations_query'
import GetUsersInOrganizationQuery from '#modules/organizations/actions/queries/members/get_users_in_organization_query'

export const getUserOwnedOrganizationsQuery = new GetUserOwnedOrganizationsQuery(
  organizationReader,
  organizationMembershipRepository
)

export const getUsersInOrganizationQuery = new GetUsersInOrganizationQuery(
  organizationMembershipRepository
)
