/* eslint-disable @typescript-eslint/no-explicit-any */
import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'

import { actionContextFromHttp } from '#modules/http/public_contracts/http_execution_context'
import { normalizePagination,
  fromLegacySnakePagination,
  toCanonicalPagePagination } from '#modules/pagination/public_contracts/pagination_public_api'
import { REVIEW_PAGINATION } from '#modules/reviews/application/dtos/common/review_pagination'
import {
  getAdminReviewDisputeDetail,
  listAdminReviewDisputes,
} from '#modules/reviews/public_contracts/review_admin_disputes'

export default class AdminDisputesController {
  async index(ctx: HttpContext) {
    const { inertia, request } = ctx
    const after = request.input('after', null) as string | null
    const before = request.input('before', null) as string | null
    const status = request.input('status', null) as string | null
    const search = request.input('search', null) as string | null
    const requestedOutcome = request.input('requested_outcome', null) as string | null
    const finalDecision = request.input('final_decision', null) as string | null
    const pagination = normalizePagination(
      {
        page: request.input('page', REVIEW_PAGINATION.DEFAULT_PAGE) as unknown,
        perPage: request.input(
          'perPage',
          request.input('per_page', REVIEW_PAGINATION.DEFAULT_PER_PAGE)
        ) as unknown,
      },
      REVIEW_PAGINATION
    )

    const execCtx = actionContextFromHttp(ctx)
    const result = await listAdminReviewDisputes({
      page: after || before ? REVIEW_PAGINATION.DEFAULT_PAGE : pagination.page,
      perPage: pagination.perPage,
      after,
      before,
      status,
      search,
      requestedOutcome,
      finalDecision,
    }, execCtx)

    return inertia.render('disputes/index' as any, {
      disputes: result.data,
      pagination: toCanonicalPagePagination(fromLegacySnakePagination(result.meta)),
      filters: {
        status,
        search,
        after,
        before,
        requested_outcome: requestedOutcome,
        final_decision: finalDecision,
      },
    })
  }

  async show(ctx: HttpContext) {
    const { inertia, params } = ctx
    const execCtx = actionContextFromHttp(ctx)
    const result = await getAdminReviewDisputeDetail({
      disputeId: params['disputeId'] as string,
    }, execCtx)

    return inertia.render('disputes/show' as any, result)
  }

  async aiOperator(ctx: HttpContext) {
    const { inertia, request } = ctx
    const execCtx = actionContextFromHttp(ctx)
    const search = request.input('search', null) as string | null
    const status = request.input('status', null) as string | null
    const pagination = normalizePagination(
      {
        page: request.input('page', REVIEW_PAGINATION.DEFAULT_PAGE) as unknown,
        perPage: request.input(
          'perPage',
          request.input('per_page', REVIEW_PAGINATION.DEFAULT_PER_PAGE)
        ) as unknown,
      },
      REVIEW_PAGINATION,
      { perPage: 25 }
    )

    const disputes = await listAdminReviewDisputes({
      page: pagination.page,
      perPage: pagination.perPage,
      search,
      status,
    }, execCtx)

    const providerRows = (await db
      .from('ai_dispute_evaluations')
      .select(
        'provider',
        db.raw('COUNT(*)::int as total'),
        db.raw(
          "SUM(CASE WHEN status IN ('queued', 'processing') THEN 1 ELSE 0 END)::int as active"
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
          "SUM(CASE WHEN status IN ('queued', 'processing') THEN 1 ELSE 0 END)::int as active"
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

    return inertia.render('disputes/ai_operator' as any, {
      disputes: disputes.data,
      pagination: toCanonicalPagePagination(fromLegacySnakePagination(disputes.meta)),
      filters: {
        search,
        status,
      },
      aiMetrics,
    })
  }
}
