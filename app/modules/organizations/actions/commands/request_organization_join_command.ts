import { DefaultOrganizationDependencies } from '../ports/organization_external_dependencies_impl.js'

import CreateJoinRequestCommand from './create_join_request_command.js'

import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import type { OrganizationActionContext } from '#modules/organizations/actions/organization_action_context'
import CheckJoinEligibilityQuery from '#modules/organizations/actions/queries/check_join_eligibility_query'


export interface RequestOrganizationJoinResult {
  organization: {
    id: string
    name: string
  }
}

export default class RequestOrganizationJoinCommand {
  constructor(protected execCtx: OrganizationActionContext) {}

  async execute(organizationId: string): Promise<RequestOrganizationJoinResult> {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException()
    }

    const actorIsActive = await DefaultOrganizationDependencies.user.isActiveUser(userId)
    if (!actorIsActive) {
      throw new BusinessLogicException('Tài khoản không active nên không thể gửi yêu cầu tham gia')
    }

    const eligibility = await CheckJoinEligibilityQuery.execute(organizationId, userId)
    if (!eligibility.organization || !eligibility.eligible) {
      throw new BusinessLogicException(eligibility.message)
    }

    await new CreateJoinRequestCommand(this.execCtx).execute(organizationId)

    return {
      organization: eligibility.organization,
    }
  }
}
