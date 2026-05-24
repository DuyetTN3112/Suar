import AppException from '#modules/errors/public_contracts/application_exception'
import { Result } from '#modules/errors/public_contracts/result'
import type {
  HttpOrganizationReader,
  HttpOrganizationUser,
} from '#modules/http/actions/ports/outbound/http_organization_reader'

export default class GetUsersInOrganizationQuery {
  constructor(private readonly organizations: HttpOrganizationReader) {}

  async executeAndWrap(
    organizationId: string,
    excludeUserId: string
  ): Promise<Result<HttpOrganizationUser[], AppException>> {
    try {
      return Result.ok(await this.execute(organizationId, excludeUserId))
    } catch (error) {
      if (error instanceof AppException) return Result.fail(error)
      throw error
    }
  }

  execute(organizationId: string, excludeUserId: string): Promise<HttpOrganizationUser[]> {
    return this.organizations.listUsers(organizationId, excludeUserId)
  }
}
