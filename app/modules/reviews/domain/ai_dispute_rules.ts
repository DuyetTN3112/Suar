import type { PolicyResult } from '#modules/authorization/public_contracts/policy_result'
import { PolicyResult as PR } from '#modules/authorization/public_contracts/policy_result'
import { isActiveReviewDisputeStatus } from '#modules/reviews/domain/review_dispute_rules'

const ADMIN_ROLES = new Set(['superadmin', 'system_admin'])

export function canStartAiDisputeEvaluation(ctx: {
  actorSystemRole: string
  disputeStatus: string
  hasCaseFile: boolean
  missingCriticalData: boolean
}): PolicyResult {
  if (!ADMIN_ROLES.has(ctx.actorSystemRole)) {
    return PR.deny('Only system admin can start AI dispute evaluation', 'FORBIDDEN')
  }

  if (ctx.disputeStatus === 'resolved') {
    return PR.deny('resolved disputes cannot start AI evaluation', 'BUSINESS_RULE')
  }

  if (!isActiveReviewDisputeStatus(ctx.disputeStatus)) {
    return PR.deny('Only active disputes can start AI evaluation', 'BUSINESS_RULE')
  }

  if (!ctx.hasCaseFile) {
    return PR.deny('AI dispute evaluation requires a case file', 'BUSINESS_RULE')
  }

  if (ctx.missingCriticalData) {
    return PR.deny('AI dispute evaluation cannot start with missing critical data', 'BUSINESS_RULE')
  }

  return PR.allow()
}
