import type { DebugOrganizationInfo } from '#modules/http/actions/dtos/debug_organization_info'
import type { DebugOrganizationInfoReader } from '#modules/http/actions/ports/outbound/debug_organization_info_reader'

export default class GetDebugOrganizationInfoQuery {
  constructor(private readonly reader: DebugOrganizationInfoReader) {}

  execute(
    userId: string,
    sessionOrganizationId: string | undefined
  ): Promise<DebugOrganizationInfo> {
    return this.reader.load(userId, sessionOrganizationId)
  }
}

