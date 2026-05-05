import { organizationUserReaderWriter } from '#composition/organizations/directory/organization_user_composition'

import type { DebugOrganizationInfo } from '#modules/http/actions/dtos/debug_organization_info'
import { DebugOrganizationInfoReader } from '#modules/http/actions/ports/outbound/debug_organization_info_reader'
import GetDebugOrganizationInfoQuery from '#modules/organizations/actions/queries/directory/get_debug_organization_info_query'

export class DebugOrganizationInfoReaderAdapter extends DebugOrganizationInfoReader {
  load(
    userId: string,
    sessionOrganizationId: string | undefined
  ): Promise<DebugOrganizationInfo> {
    return new GetDebugOrganizationInfoQuery(organizationUserReaderWriter).execute(
      userId,
      sessionOrganizationId
    )
  }
}
