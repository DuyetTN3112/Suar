import type { AdminActionContext } from '#modules/admin/packages/actions/action_context'
import type UpdateSubscriptionCommand from '#modules/admin/packages/actions/command/update_subscription_command'
import type GetSubscriptionQrCatalogQuery from '#modules/admin/packages/actions/query/get_subscription_qr_catalog_query'
import type ListSubscriptionsQuery from '#modules/admin/packages/actions/query/list_subscriptions_query'

export abstract class AdminPackageActionFactory {
  abstract makeListSubscriptionsQuery(execCtx: AdminActionContext): ListSubscriptionsQuery

  abstract makeGetSubscriptionQrCatalogQuery(
    execCtx: AdminActionContext
  ): GetSubscriptionQrCatalogQuery

  abstract makeUpdateSubscriptionCommand(
    execCtx: AdminActionContext
  ): UpdateSubscriptionCommand
}
