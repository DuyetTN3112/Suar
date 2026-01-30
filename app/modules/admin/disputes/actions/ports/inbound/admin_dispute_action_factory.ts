import type { AdminActionContext } from '#modules/admin/disputes/actions/action_context'
import type GetAdminDisputeDetailQuery from '#modules/admin/disputes/actions/query/get_admin_dispute_detail_query'
import type ListAdminDisputesQuery from '#modules/admin/disputes/actions/query/list_admin_disputes_query'

export abstract class AdminDisputeActionFactory {
  abstract makeListAdminDisputesQuery(
    execCtx: AdminActionContext
  ): ListAdminDisputesQuery

  abstract makeGetAdminDisputeDetailQuery(
    execCtx: AdminActionContext
  ): GetAdminDisputeDetailQuery
}
