import type { DebugOrganizationInfo } from '#modules/http/actions/dtos/debug_organization_info'

export abstract class DebugOrganizationInfoReader {
  abstract load(
    userId: string,
    sessionOrganizationId: string | undefined
  ): Promise<DebugOrganizationInfo>
}
