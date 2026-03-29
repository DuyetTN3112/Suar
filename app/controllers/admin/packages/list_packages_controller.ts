import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import ListSubscriptionsQuery from '#actions/admin/packages/queries/list_subscriptions_query'

export default class ListPackagesController {
  async handle(ctx: HttpContext) {
    const { inertia, request } = ctx
    const execCtx = ExecutionContext.fromHttp(ctx)

    const toPageNumber = (value: unknown): number => {
      if (typeof value === 'number' && Number.isFinite(value)) {
        return Math.max(1, Math.trunc(value))
      }
      if (typeof value === 'string') {
        const parsed = Number(value)
        return Number.isFinite(parsed) ? Math.max(1, Math.trunc(parsed)) : 1
      }
      return 1
    }

    const toOptionalString = (value: unknown): string | undefined => {
      return typeof value === 'string' && value.trim().length > 0 ? value : undefined
    }

    const query = new ListSubscriptionsQuery(execCtx)
    const result = await query.handle({
      page: toPageNumber(request.input('page', 1) as unknown),
      perPage: 20,
      search: toOptionalString(request.input('search', '') as unknown),
      plan: toOptionalString(request.input('plan', '') as unknown),
      status: toOptionalString(request.input('status', '') as unknown),
    })

    return inertia.render('admin/packages/index', {
      stats: result.stats,
      subscriptions: result.subscriptions,
      meta: result.meta,
      filters: {
        search: toOptionalString(request.input('search', '') as unknown) ?? '',
        plan: toOptionalString(request.input('plan', '') as unknown) ?? '',
        status: toOptionalString(request.input('status', '') as unknown) ?? '',
      },
      packages: [
        {
          id: 'pro',
          name: 'Pro',
          priceLabel: '399.000đ / tháng',
          features: ['Marketplace boost', 'Advanced profile proof', 'Priority support'],
        },
        {
          id: 'promax',
          name: 'ProMax',
          priceLabel: '799.000đ / tháng',
          features: [
            'Everything in Pro',
            'Premium ranking priority',
            'Extended analytics',
            'Dedicated moderation queue',
          ],
        },
      ],
    })
  }
}
