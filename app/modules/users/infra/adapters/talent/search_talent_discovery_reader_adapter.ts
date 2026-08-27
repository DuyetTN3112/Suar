import ForbiddenException from '#modules/errors/public_contracts/forbidden_exception'
import type { HttpActionContext } from '#modules/http/public_contracts/http_action_context'
import type { SearchDiscoveryResponse } from '#modules/search/public_contracts/search_discovery_contract'
import type { SearchDiscoveryPublicApi } from '#modules/search/public_contracts/search_public_api'
import type { TalentSearchDiscoveryDocument } from '#modules/search/public_contracts/talent_search_discovery_document'
import { buildTalentDiscoveryRequest } from '#modules/users/actions/mappers/talent-discovery/talent_discovery_request_builder'
import type {
  TalentDiscoveryReader,
  TalentDiscoveryReaderInput,
} from '#modules/users/actions/ports/outbound/talent_discovery_reader'

export class SearchTalentDiscoveryReaderAdapter implements TalentDiscoveryReader {
  private readonly search: SearchDiscoveryPublicApi

  constructor(search: Pick<SearchDiscoveryPublicApi, 'discover'>) {
    this.search = search
  }

  read(
    input: TalentDiscoveryReaderInput
  ): Promise<SearchDiscoveryResponse<TalentSearchDiscoveryDocument>> {
    assertRecruiterContext(input.execCtx)
    const request = buildTalentDiscoveryRequest(
      input.input,
      input.cursor === undefined ? {} : { cursor: input.cursor }
    )
    return this.search.discover<TalentSearchDiscoveryDocument>(request, input.execCtx, {
      ...(input.searchSessionId === undefined ? {} : { searchSessionId: input.searchSessionId }),
      ...(input.signal === undefined ? {} : { signal: input.signal }),
    })
  }
}

function assertRecruiterContext(execCtx: HttpActionContext): void {
  if (
    execCtx.userId === null ||
    execCtx.userId.length === 0 ||
    execCtx.organizationId === null ||
    execCtx.organizationId.length === 0 ||
    (execCtx.actorRoleSurface !== 'org_owner' && execCtx.actorRoleSurface !== 'org_admin')
  ) {
    throw new ForbiddenException(
      'Talent discovery requires a server-resolved organization owner or admin'
    )
  }
}
