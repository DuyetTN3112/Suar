import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { AdminDisputeActionFactory } from '#modules/admin/disputes/actions/ports/inbound/admin_dispute_action_factory'
import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import {
  normalizePagination,
  fromLegacySnakePagination,
  toCanonicalPagePagination,
} from '#modules/pagination/public_contracts/pagination_public_api'
import { REVIEW_PAGINATION } from '#modules/reviews/public_contracts/review_pagination'

interface AgentRuntimeHealth {
  state: 'online' | 'offline' | 'misconfigured'
  checked_at: string
  diagnostic: string | null
  service?: string
  started_at?: string
  active_evaluations?: Array<{
    evaluation_id: string
    title?: string
    started_at: string
    stage: string
  }>
}

async function probeConfiguredClawagent(): Promise<AgentRuntimeHealth> {
  const configuredUrl = process.env['CLAWAGENT_API_URL']
  if (!configuredUrl) {
    return {
      state: 'misconfigured',
      checked_at: new Date().toISOString(),
      diagnostic: 'CLAWAGENT_API_URL is not configured',
    }
  }
  try {
    const url = new URL(configuredUrl)
    url.pathname = '/healthz'
    url.search = ''
    const response = await fetch(url, { signal: AbortSignal.timeout(3_000) })
    if (!response.ok) throw new Error(`health probe returned HTTP ${response.status}`)
    const payload = (await response.json()) as Record<string, unknown>
    const activeEvaluations = Array.isArray(payload['active_evaluations'])
      ? (payload['active_evaluations'] as NonNullable<AgentRuntimeHealth['active_evaluations']>)
      : undefined
    return {
      state: payload['ok'] === true ? 'online' : 'offline',
      checked_at: new Date().toISOString(),
      diagnostic: payload['ok'] === true ? null : 'agent returned an unhealthy response',
      ...(typeof payload['service'] === 'string' ? { service: payload['service'] } : {}),
      ...(typeof payload['started_at'] === 'string' ? { started_at: payload['started_at'] } : {}),
      ...(activeEvaluations ? { active_evaluations: activeEvaluations } : {}),
    }
  } catch (error) {
    return {
      state: 'offline',
      checked_at: new Date().toISOString(),
      diagnostic: error instanceof Error ? error.message : 'health probe failed',
    }
  }
}

@inject()
export default class AdminDisputesController {
  constructor(private readonly actions: AdminDisputeActionFactory) {}

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
    const result = await this.actions.makeListAdminDisputesQuery(execCtx).handle({
      page: after || before ? REVIEW_PAGINATION.DEFAULT_PAGE : pagination.page,
      perPage: pagination.perPage,
      after,
      before,
      status,
      search,
      requestedOutcome,
      finalDecision,
    })

    return inertia.render('admin/disputes/index', {
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
    const result = await this.actions.makeGetAdminDisputeDetailQuery(execCtx).handle({
      disputeId: params['disputeId'] as string,
    })

    return inertia.render('admin/disputes/show', result)
  }

  async aiOperator(ctx: HttpContext) {
    const { inertia, request } = ctx
    const pagination = normalizePagination(
      { page: request.input('page', REVIEW_PAGINATION.DEFAULT_PAGE) as unknown, perPage: 25 },
      REVIEW_PAGINATION
    )
    const [result, agentRuntime] = await Promise.all([
      this.actions
        .makeGetAiOperatorOverviewQuery(actionContextFromHttp(ctx))
        .handle({ page: pagination.page, perPage: pagination.perPage }),
      probeConfiguredClawagent(),
    ])

    return inertia.render('admin/disputes/ai_operator', { ...result, agent_runtime: agentRuntime })
  }
}
