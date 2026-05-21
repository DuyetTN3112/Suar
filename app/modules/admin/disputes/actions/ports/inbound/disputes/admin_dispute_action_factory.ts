import type { AdminActionContext } from '#modules/admin/disputes/actions/action_context'
import type GetAdminDisputeDetailQuery from '#modules/admin/disputes/actions/queries/disputes/get_admin_dispute_detail_query'
import type GetAiOperatorOverviewQuery from '#modules/admin/disputes/actions/queries/disputes/get_ai_operator_overview_query'
import type ListAdminDisputesQuery from '#modules/admin/disputes/actions/queries/disputes/list_admin_disputes_query'

export abstract class AdminDisputeActionFactory {
  abstract makeListAdminDisputesQuery(execCtx: AdminActionContext): ListAdminDisputesQuery

  abstract makeGetAdminDisputeDetailQuery(execCtx: AdminActionContext): GetAdminDisputeDetailQuery

  abstract makeGetAiOperatorOverviewQuery(execCtx: AdminActionContext): GetAiOperatorOverviewQuery
}
