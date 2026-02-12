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

export class AuthorizeSearchIndexOperatorQuery {
  constructor(
    private readonly principals: SearchIndexOperatorPrincipalReader,
    private readonly permissions: SearchIndexOperatorPermissionReader,
    private readonly configuredPrincipalId: string | undefined
  ) {}

  async handle(
    input: AuthorizeSearchIndexOperatorInput
  ): Promise<AuthorizedSearchIndexOperator | null> {
    const configuredActorId = this.configuredPrincipalId?.trim()
    if (!configuredActorId || !UUID_PATTERN.test(configuredActorId)) {
      return null
    }
    if (input.assertedActorId?.trim() !== undefined) {
      if (input.assertedActorId.trim() !== configuredActorId) {
        return null
      }
    }

    const actor = await this.principals.findPrincipal(configuredActorId)
    if (
      !actor ||
      actor.id !== configuredActorId ||
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
      actorType: 'service',
      authenticationProvenance: 'runtime_environment',
    })
  }
}
