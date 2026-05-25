/* eslint-disable @typescript-eslint/no-explicit-any */
import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'

import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import GetAdminReviewDisputeDetailQuery from '#modules/reviews/actions/queries/get_admin_review_dispute_detail_query'
import ListAdminReviewDisputesQuery from '#modules/reviews/actions/queries/list_admin_review_disputes_query'

export default class AdminDisputesController {
  async index(ctx: HttpContext) {
    const { inertia, request } = ctx
    const page = Number(request.input('page', 1))
    const perPage = Number(request.input('per_page', 20))
    const status = request.input('status', null) as string | null
    const search = request.input('search', null) as string | null

    const execCtx = actionContextFromHttp(ctx)
    const result = await new ListAdminReviewDisputesQuery(execCtx).execute({
      page: Number.isFinite(page) ? page : 1,
      per_page: Number.isFinite(perPage) ? perPage : 20,
      status,
      search,
    })

    return inertia.render('admin/disputes/index' as any, {
      disputes: result.data,
      meta: result.meta,
      filters: {
        status,
        search,
      },
    })
  }

  async show(ctx: HttpContext) {
    const { inertia, params } = ctx
    const execCtx = actionContextFromHttp(ctx)
    const result = await new GetAdminReviewDisputeDetailQuery(execCtx).execute({
      dispute_id: params.id as string,
    })

    return inertia.render('admin/disputes/show' as any, result)
  }

  async aiOperator(ctx: HttpContext) {
    const { inertia, request } = ctx
    const execCtx = actionContextFromHttp(ctx)
    const search = request.input('search', null) as string | null
    const status = request.input('status', null) as string | null

    const disputes = await new ListAdminReviewDisputesQuery(execCtx).execute({
      page: 1,
      per_page: 25,
      search,
      status,
    })

    const providerRows = (await db
      .from('ai_dispute_evaluations')
      .select(
        'provider',
        db.raw('COUNT(*)::int as total'),
        db.raw(
          "SUM(CASE WHEN status IN ('queued', 'pending', 'running') THEN 1 ELSE 0 END)::int as active"
        ),
        db.raw("SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END)::int as completed"),
        db.raw(
          "SUM(CASE WHEN status IN ('failed', 'cancelled') THEN 1 ELSE 0 END)::int as failed"
        )
      )
      .groupBy('provider')
      .orderBy('provider', 'asc')) as {
      provider: string | null
      total?: number | string
      active?: number | string
      completed?: number | string
      failed?: number | string
    }[]

    const totals = (await db
      .from('ai_dispute_evaluations')
      .select(
        db.raw('COUNT(*)::int as total'),
        db.raw(
          "SUM(CASE WHEN status IN ('queued', 'pending', 'running') THEN 1 ELSE 0 END)::int as active"
        ),
        db.raw("SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END)::int as completed"),
        db.raw(
          "SUM(CASE WHEN status IN ('failed', 'cancelled') THEN 1 ELSE 0 END)::int as failed"
        )
      )
      .first()) as
      | {
          total?: number | string
          active?: number | string
          completed?: number | string
          failed?: number | string
        }
      | undefined

    const aiMetrics = {
      totalEvaluations: Number(totals?.total ?? 0),
      activeEvaluations: Number(totals?.active ?? 0),
      completedEvaluations: Number(totals?.completed ?? 0),
      failedEvaluations: Number(totals?.failed ?? 0),
      queuedDisputes: disputes.data.filter(
        (dispute) =>
          dispute.status === 'admin_reviewing' ||
          dispute.status === 'ai_reviewing' ||
          dispute.ai_evaluations_count > 0
      ).length,
      providers: providerRows.map((row) => ({
        provider: row.provider ?? 'unknown',
        total: Number(row.total ?? 0),
        active: Number(row.active ?? 0),
        completed: Number(row.completed ?? 0),
        failed: Number(row.failed ?? 0),
      })),
    }

    return inertia.render('admin/disputes/ai_operator' as any, {
      disputes: disputes.data,
      filters: {
        search,
        status,
      },
      aiMetrics,
    })
  }
}
