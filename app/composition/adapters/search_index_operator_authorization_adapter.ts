import type { ComposedUserIdentityReader } from '#composition/adapters/composed_user_identity_reader'
import { hasSystemPermission } from '#modules/authorization/public_contracts/permissions'
import type {
  SearchIndexOperatorPermissionReader,
  SearchIndexOperatorPrincipalReader,
  SearchIndexOperatorPrincipalRecord,
} from '#modules/search/actions/ports/outbound/search_index_operator_authorization_port'

export class SearchIndexOperatorAuthorizationAdapter
  implements SearchIndexOperatorPrincipalReader, SearchIndexOperatorPermissionReader
{
  constructor(
    private readonly users: ComposedUserIdentityReader
  ) {}

  async findPrincipal(actorId: string): Promise<SearchIndexOperatorPrincipalRecord | null> {
    const identity = await this.users.findSessionIdentity(actorId)
    if (!identity || identity.deleted_at !== null) {
      return null
    }
    return {
      id: identity.id,
      systemRole: identity.system_role,
      status: identity.status,
    }
  }

  hasPermission(systemRole: string, permission: string): Promise<boolean> {
    return hasSystemPermission(systemRole, permission)
  }
}
