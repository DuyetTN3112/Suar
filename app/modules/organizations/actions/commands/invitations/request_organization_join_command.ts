import CreateJoinRequestCommand from './create_join_request_command.js'

import type AppException from '#modules/errors/public_contracts/application_exception'
import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import ForbiddenException from '#modules/errors/public_contracts/forbidden_exception'
import type { Result } from '#modules/errors/public_contracts/result'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import type { OrganizationActionContext } from '#modules/organizations/actions/action_context'
import { BaseCommand } from '#modules/organizations/actions/commands/base_command'
import type { OrganizationUserReaderWriter } from '#modules/organizations/actions/ports/outbound/invitations/organization_external_dependencies'
import type { OrganizationNotificationStager } from '#modules/organizations/actions/ports/outbound/invitations/organization_notification_stager'
import type {
  OrganizationMembershipRepository,
  OrganizationReader,
} from '#modules/organizations/actions/ports/outbound/invitations/organization_persistence'
import type { OrganizationTransactionRunner } from '#modules/organizations/actions/ports/outbound/organization_transaction'
import CheckJoinEligibilityQuery from '#modules/organizations/actions/queries/invitations/check_join_eligibility_query'


export interface RequestOrganizationJoinResult {
  organization: {
    id: string
    name: string
  }
}

export interface RequestOrganizationJoinInput {
  organizationId: string
}

export default class RequestOrganizationJoinCommand extends BaseCommand<
  RequestOrganizationJoinInput,
  RequestOrganizationJoinResult
> {
  constructor(
    protected override execCtx: OrganizationActionContext,
    private readonly userReaderWriter: OrganizationUserReaderWriter,
    private readonly notificationStager: OrganizationNotificationStager,
    private readonly joinTransactionRunner: OrganizationTransactionRunner,
    private readonly organizations: OrganizationReader,
    private readonly memberships: OrganizationMembershipRepository
  ) {
    super(execCtx, joinTransactionRunner)
  }

  override async handle(input: RequestOrganizationJoinInput): Promise<RequestOrganizationJoinResult> {
    return this.execute(input.organizationId)
  }

  override async executeAndWrap(
    input: RequestOrganizationJoinInput
  ): Promise<Result<RequestOrganizationJoinResult, AppException>>
  override async executeAndWrap(
    organizationId: string
  ): Promise<Result<RequestOrganizationJoinResult, AppException>>
  override async executeAndWrap(
    organizationIdOrInput: string | RequestOrganizationJoinInput
  ): Promise<Result<RequestOrganizationJoinResult, AppException>> {
    return super.executeAndWrap(
      typeof organizationIdOrInput === 'string'
        ? { organizationId: organizationIdOrInput }
        : organizationIdOrInput
    )
  }

  async execute(organizationId: string): Promise<RequestOrganizationJoinResult> {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException()
    }

    const actorIsActive = await this.userReaderWriter.isActiveUser(userId)
    if (!actorIsActive) {
      throw new ForbiddenException('Tài khoản không active nên không thể gửi yêu cầu tham gia')
    }

    const eligibility = await new CheckJoinEligibilityQuery(
      this.organizations,
      this.memberships
    ).execute(organizationId, userId)
    if (!eligibility.organization || !eligibility.eligible) {
      throw new BusinessLogicException(eligibility.message)
    }

    await new CreateJoinRequestCommand(
      this.execCtx,
      this.userReaderWriter,
      this.notificationStager,
      this.joinTransactionRunner,
      this.organizations,
      this.memberships
    ).execute(organizationId)

    return {
      organization: eligibility.organization,
    }
  }
}
