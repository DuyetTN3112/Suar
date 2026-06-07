import AppException from '#modules/errors/public_contracts/application_exception'
import { Result } from '#modules/errors/public_contracts/result'
import { BaseQuery } from '#modules/http/actions/base_query'
import type { DebugOrganizationInfo } from '#modules/http/actions/dtos/debug_organization_info'
import type { DebugOrganizationInfoReader } from '#modules/http/actions/ports/outbound/debug_organization_info_reader'

export default class GetDebugOrganizationInfoQuery extends BaseQuery<
  [string, string | undefined],
  DebugOrganizationInfo
> {
  constructor(private readonly reader: DebugOrganizationInfoReader) {
    super()
  }

  async executeAndWrap(userId: string, sessionOrganizationId: string | undefined) {
    try {
      return Result.ok(await this.execute(userId, sessionOrganizationId))
    } catch (error) {
      if (error instanceof AppException) return Result.fail(error)
      throw error
    }
  }

  execute(
    userId: string,
    sessionOrganizationId: string | undefined
  ): Promise<DebugOrganizationInfo> {
    return this.reader.load(userId, sessionOrganizationId)
  }
}
