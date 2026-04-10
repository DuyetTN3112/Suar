import type { ExecutionContext } from '#types/execution_context'
import type { DatabaseId } from '#types/database'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import BusinessLogicException from '#exceptions/business_logic_exception'
import CheckJoinEligibilityQuery from '#actions/organizations/queries/check_join_eligibility_query'
import CreateJoinRequestCommand from './create_join_request_command.js'

export interface RequestOrganizationJoinResult {
  organization: {
    id: DatabaseId
    name: string
  }
}

export default class RequestOrganizationJoinCommand {
  constructor(protected execCtx: ExecutionContext) {}

  async execute(organizationId: DatabaseId): Promise<RequestOrganizationJoinResult> {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException()
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
