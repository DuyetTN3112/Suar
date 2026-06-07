import AppException from '#modules/errors/public_contracts/application_exception'
import { Result } from '#modules/errors/public_contracts/result'
import type {
  HttpOrganizationMembersReader,
  HttpOrganizationMembersResult,
} from '#modules/http/actions/ports/outbound/http_organization_members_reader'

export default class GetOrganizationMembersQuery {
  constructor(private readonly organizations: HttpOrganizationMembersReader) {}

  async executeAndWrap(
    rawOrganizationId: string,
    rawQuery?: string
  ): Promise<Result<HttpOrganizationMembersResult, AppException>> {
    try {
      return Result.ok(await this.execute(rawOrganizationId, rawQuery))
    } catch (error) {
      if (error instanceof AppException) return Result.fail(error)
      throw error
    }
  }

  execute(rawOrganizationId: string, rawQuery?: string): Promise<HttpOrganizationMembersResult> {
    return this.organizations.read(rawOrganizationId, rawQuery)
  }
}
