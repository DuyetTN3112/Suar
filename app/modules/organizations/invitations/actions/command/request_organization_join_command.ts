import CreateJoinRequestCommand from './create_join_request_command.js'

import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import ForbiddenException from '#modules/errors/public_contracts/forbidden_exception'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import type { OrganizationActionContext } from '#modules/organizations/invitations/actions/action_context'
import type { OrganizationUserReaderWriter } from '#modules/organizations/invitations/actions/ports/outbound/organization_external_dependencies'
import type { OrganizationNotificationStager } from '#modules/organizations/invitations/actions/ports/outbound/organization_notification_stager'
import type {
  OrganizationMembershipRepository,
  OrganizationReader,
} from '#modules/organizations/invitations/actions/ports/outbound/organization_persistence'
import type { OrganizationTransactionRunner } from '#modules/organizations/invitations/actions/ports/outbound/organization_transaction'
import CheckJoinEligibilityQuery from '#modules/organizations/invitations/actions/query/check_join_eligibility_query'


export interface RequestOrganizationJoinResult {
  organization: {
    id: string
    name: string
  }
}

export default class RequestOrganizationJoinCommand {
  constructor(
    protected execCtx: OrganizationActionContext,
    private readonly userReaderWriter: OrganizationUserReaderWriter,
    private readonly notificationStager: OrganizationNotificationStager,
    private readonly transactionRunner: OrganizationTransactionRunner,
    private readonly organizations: OrganizationReader,
    private readonly memberships: OrganizationMembershipRepository
  ) {}

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
      this.notificationStager,
      this.transactionRunner,
      this.organizations,
      this.memberships
    ).execute(organizationId)

    return {
      organization: eligibility.organization,
    }
  }
}
