import db from '@adonisjs/lucid/services/db'

const toNumberValue = (value: unknown): number => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0
  }
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null
}

const hasToIso = (value: unknown): value is { toISO: () => string | null } => {
  return isRecord(value) && typeof value.toISO === 'function'
}

const toNullableString = (value: unknown): string | null => {
  if (typeof value === 'string') {
    return value
  }
  if (value instanceof Date) {
    return value.toISOString()
  }
  if (hasToIso(value)) {
    const isoValue = value.toISO()
    return typeof isoValue === 'string' ? isoValue : null
  }
  return null
}

export interface ListSubscriptionsFilters {
  search?: string
  plan?: string
  status?: string
}

export interface SubscriptionListItem {
  id: string
  user_id: string
  username: string
  email: string | null
  system_role: string
  plan: string
  status: string
  started_at: string | null
  expires_at: string | null
  auto_renew: boolean
  created_at: string | null
  updated_at: string | null
}

export interface SubscriptionStats {
  total: number
  active: number
  expiringSoon: number
  cancelled: number
  byPlan: Record<string, number>
}

export default class AdminSubscriptionRepository {
  async getSubscriptionStats(): Promise<SubscriptionStats> {
    const [totalRow, activeRow, cancelledRow, expiringSoonRow, planRows] = (await Promise.all([
      db.from('user_subscriptions').count('* as total').first(),
      db.from('user_subscriptions').where('status', 'active').count('* as total').first(),
      db.from('user_subscriptions').where('status', 'cancelled').count('* as total').first(),
      db
        .from('user_subscriptions')
        .where('status', 'active')
        .whereNotNull('expires_at')
        .whereRaw(`expires_at <= NOW() + INTERVAL '14 days'`)
        .count('* as total')
        .first(),
      db.from('user_subscriptions').select('plan').count('* as total').groupBy('plan'),
    ])) as unknown[]

    const byPlan: Record<string, number> = {}
    if (Array.isArray(planRows)) {
      for (const row of planRows) {
        if (!isRecord(row) || typeof row.plan !== 'string') {
          continue
        }
        byPlan[row.plan] = toNumberValue(row.total)
      }
    }

    return {
      total: isRecord(totalRow) ? toNumberValue(totalRow.total) : 0,
      active: isRecord(activeRow) ? toNumberValue(activeRow.total) : 0,
      cancelled: isRecord(cancelledRow) ? toNumberValue(cancelledRow.total) : 0,
      expiringSoon: isRecord(expiringSoonRow) ? toNumberValue(expiringSoonRow.total) : 0,
      byPlan,
    }
  }

  async listSubscriptions(
    filters: ListSubscriptionsFilters,
    page: number,
    perPage: number
  ): Promise<{ subscriptions: SubscriptionListItem[]; total: number }> {
    const baseQuery = db.from('user_subscriptions as us').join('users as u', 'u.id', 'us.user_id')

    const applyFilters = (query: ReturnType<typeof db.from>) => {
      const search = filters.search
      if (search) {
        void query.where((builder) => {
          void builder
            .whereILike('u.username', `%${search}%`)
            .orWhereILike('u.email', `%${search}%`)
        })
      }
      if (filters.plan) {
        void query.where('us.plan', filters.plan)
      }
      if (filters.status) {
        void query.where('us.status', filters.status)
      }
    }

    const listQuery = baseQuery.clone()
    applyFilters(listQuery)

    const countQuery = baseQuery.clone()
    applyFilters(countQuery)

    const [rows, totalRow] = (await Promise.all([
      listQuery
        .select(
          'us.id',
          'us.user_id',
          'u.username',
          'u.email',
          'u.system_role',
          'us.plan',
          'us.status',
          'us.started_at',
          'us.expires_at',
          'us.auto_renew',
          'us.created_at',
          'us.updated_at'
        )
        .orderBy('us.updated_at', 'desc')
        .limit(perPage)
        .offset((page - 1) * perPage),
      countQuery.count('* as total').first(),
    ])) as [Record<string, unknown>[], Record<string, unknown> | null]

    return {
      subscriptions: rows.map((row) => ({
        id: String(row.id),
        user_id: String(row.user_id),
        username: typeof row.username === 'string' ? row.username : 'Unknown',
        email: typeof row.email === 'string' ? row.email : null,
        system_role: typeof row.system_role === 'string' ? row.system_role : 'registered_user',
        plan: typeof row.plan === 'string' ? row.plan : 'free',
        status: typeof row.status === 'string' ? row.status : 'active',
        started_at: toNullableString(row.started_at),
        expires_at: toNullableString(row.expires_at),
        auto_renew: Boolean(row.auto_renew),
        created_at: toNullableString(row.created_at),
        updated_at: toNullableString(row.updated_at),
      })),
      total: isRecord(totalRow) ? toNumberValue(totalRow.total) : 0,
    }
  }

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
  }
}
