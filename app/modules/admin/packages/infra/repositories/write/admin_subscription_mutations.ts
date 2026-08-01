import db from '@adonisjs/lucid/services/db'

import type {
  AdminSubscriptionUpdate,
  AdminSubscriptionWriter,
} from '#modules/admin/packages/actions/ports/outbound/admin_operational_repository'

export const AdminSubscriptionWriteOps: AdminSubscriptionWriter = {
  async updateSubscription(
    subscriptionId: string,
    payload: AdminSubscriptionUpdate
  ): Promise<void> {
    await db
      .from('user_subscriptions')
      .where('id', subscriptionId)
      .update({
        ...(payload.plan !== undefined ? { plan: payload.plan } : {}),
        ...(payload.status !== undefined ? { status: payload.status } : {}),
        ...(payload.auto_renew !== undefined ? { auto_renew: payload.auto_renew } : {}),
        ...(payload.expires_at !== undefined ? { expires_at: payload.expires_at } : {}),
        updated_at: new Date().toISOString(),
      })
  },
}
