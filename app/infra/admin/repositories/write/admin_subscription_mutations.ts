import db from '@adonisjs/lucid/services/db'

export const AdminSubscriptionWriteOps = {
  async updateSubscription(
    subscriptionId: string,
    payload: {
      plan?: string
      status?: string
      auto_renew?: boolean
      expires_at?: string | null
    }
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
