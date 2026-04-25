import { SearchIndexOperatorAuthorizationAdapter } from '#composition/adapters/search/search_index_operator_authorization_adapter'
import { userIdentityReader } from '#composition/users/user-application/user_application_composition'
import { searchAdminConfig } from '#config/search'
import { AuthorizeSearchIndexOperatorQuery } from '#modules/search/actions/queries/index-administration/authorize_search_index_operator_query'

const adapter = new SearchIndexOperatorAuthorizationAdapter(userIdentityReader)

export const authorizeSearchIndexOperatorQuery = new AuthorizeSearchIndexOperatorQuery(
  adapter,
  adapter,
  searchAdminConfig.servicePrincipalId
)
