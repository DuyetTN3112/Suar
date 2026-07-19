import { BaseQuery } from '#modules/search/actions/base_query'
import type {
  AuthorizedSearchIndexOperator,
  AuthorizeSearchIndexOperatorInput,
} from '#modules/search/actions/dtos/search_index_operator'
import type {
  SearchIndexOperatorPermissionReader,
  SearchIndexOperatorPrincipalReader,
} from '#modules/search/actions/ports/outbound/search_index_operator_authorization_port'

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu
const SEARCH_INDEX_ADMINISTRATION_PERMISSION = 'can_manage_system_settings'

export class AuthorizeSearchIndexOperatorQuery extends BaseQuery<
  AuthorizeSearchIndexOperatorInput,
  AuthorizedSearchIndexOperator | null
> {
  constructor(
    private readonly principals: SearchIndexOperatorPrincipalReader,
    private readonly permissions: SearchIndexOperatorPermissionReader,
    private readonly configuredPrincipalId: string | undefined
  ) {
    super()
  }

  async handle(
    input: AuthorizeSearchIndexOperatorInput
  ): Promise<AuthorizedSearchIndexOperator | null> {
    const configuredActorId = this.configuredPrincipalId?.trim() || undefined
    const assertedActorId = input.assertedActorId?.trim()
    const actorId = configuredActorId ?? assertedActorId
    if (!actorId || !UUID_PATTERN.test(actorId)) {
      return null
    }
    if (configuredActorId && assertedActorId !== undefined) {
      if (assertedActorId !== configuredActorId) {
        return null
      }
    }

    const actor = await this.principals.findPrincipal(actorId)
    if (
      !actor ||
      actor.id !== actorId ||
      actor.status !== 'active' ||
      !(await this.permissions.hasPermission(
        actor.systemRole,
        SEARCH_INDEX_ADMINISTRATION_PERMISSION
      ))
    ) {
      return null
    }

    return Object.freeze({
      id: actor.id,
      systemRole: actor.systemRole,
      actorType: configuredActorId ? 'service' : 'human',
      authenticationProvenance: configuredActorId ? 'runtime_environment' : 'session',
    })
  }
}
