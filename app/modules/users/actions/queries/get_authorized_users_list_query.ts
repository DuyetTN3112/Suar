import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import type { UserPaginatedResult } from '#modules/users/actions/dtos/common/user_action_dtos'
import { GetUsersListDTO } from '#modules/users/actions/dtos/request/get_users_list_dto'
import type { SystemUserAdminAccessAuthorizer } from '#modules/users/actions/ports/outbound/system_user_admin_access_authorizer'
import type GetUsersListQuery from '#modules/users/actions/queries/get_users_list_query'
import type { UserActionContext } from '#modules/users/actions/user_action_context'
import type { UserRecord } from '#modules/users/types/user_records'

/**
 * System-admin boundary for Users list reads.
 *
 * The query owns authorization and replaces the untrusted organization id in
 * the incoming DTO with the organization from its execution context.
 */
export default class GetAuthorizedUsersListQuery {
  constructor(
    private readonly context: UserActionContext,
    private readonly usersList: GetUsersListQuery,
    private readonly adminAccess: SystemUserAdminAccessAuthorizer
  ) {}

  async handle(dto: GetUsersListDTO): Promise<UserPaginatedResult<UserRecord>> {
    const organizationId = await this.requireAdminAccess()
    return this.usersList.handle(this.withTrustedOrganization(dto, organizationId))
  }

  async tryHandle(
    dto: GetUsersListDTO
  ): Promise<UserPaginatedResult<UserRecord> | null> {
    const organizationId = await this.resolveAdminAccess()
    if (!organizationId) {
      return null
    }

    return this.usersList.handle(this.withTrustedOrganization(dto, organizationId))
  }

  private withTrustedOrganization(
    dto: GetUsersListDTO,
    organizationId: string
  ): GetUsersListDTO {
    return new GetUsersListDTO(dto.pagination, organizationId, dto.filters)
  }

  private async requireAdminAccess(): Promise<string> {
    const { userId, organizationId } = this.context
    if (!userId) {
      throw new UnauthorizedException()
    }
    if (!organizationId) {
      throw new BusinessLogicException(ErrorMessages.REQUIRE_ORGANIZATION)
    }

    await this.adminAccess.authorize(userId, organizationId)
    return organizationId
  }

  private async resolveAdminAccess(): Promise<string | null> {
    const { userId, organizationId } = this.context
    if (!userId || !organizationId) {
      return null
    }

    return (await this.adminAccess.isAllowed(userId, organizationId))
      ? organizationId
      : null
  }
}
