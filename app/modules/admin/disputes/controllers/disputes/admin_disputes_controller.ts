import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { AdminDisputeActionFactory } from '#modules/admin/disputes/actions/ports/inbound/disputes/admin_dispute_action_factory'
import {
  buildAdminDisputeDetailRequest,
  buildAdminDisputeListRequest,
  buildAiOperatorDisputeRequest,
} from '#modules/admin/disputes/controllers/mappers/request/disputes/admin_dispute_list_request_mapper'
import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import {
  fromLegacySnakePagination,
  toCanonicalPagePagination,
} from '#modules/pagination/public_contracts/pagination_public_api'

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
    if (!response.ok) {
      return {
        state: 'offline',
        checked_at: new Date().toISOString(),
        diagnostic: 'agent returned an unhealthy response',
      }
    }
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
  } catch {
    return {
      state: 'offline',
      checked_at: new Date().toISOString(),
      diagnostic: 'health probe failed',
    }
  }
}

@inject()
export default class AdminDisputesController {
  constructor(private readonly actions: AdminDisputeActionFactory) {}

  async index(ctx: HttpContext) {
    const { inertia, request } = ctx
    const filters = buildAdminDisputeListRequest(request)
    const execCtx = actionContextFromHttp(ctx)
    const result = await this.actions.makeListAdminDisputesQuery(execCtx).handle(filters)

    return inertia.render('admin/disputes/index', {
      disputes: result.data,
      pagination: toCanonicalPagePagination(fromLegacySnakePagination(result.meta)),
      filters: {
        status: filters.status,
        search: filters.search,
        after: filters.after,
        before: filters.before,
        requested_outcome: filters.requestedOutcome,
        final_decision: filters.finalDecision,
      },
    })
  }

  async show(ctx: HttpContext) {
    const { inertia, params } = ctx
    const { disputeId } = buildAdminDisputeDetailRequest(params)
    const execCtx = actionContextFromHttp(ctx)
    const result = await this.actions.makeGetAdminDisputeDetailQuery(execCtx).handle({
      disputeId,
    })

    return inertia.render('admin/disputes/show', result)
  }

  async aiOperator(ctx: HttpContext) {
    const { inertia, request } = ctx
    const pagination = buildAiOperatorDisputeRequest(request)
    const [result, agentRuntime] = await Promise.all([
      this.actions
        .makeGetAiOperatorOverviewQuery(actionContextFromHttp(ctx))
        .handle({ page: pagination.page, perPage: pagination.perPage }),
      probeConfiguredClawagent(),
    ])

    return inertia.render('admin/disputes/ai_operator', { ...result, agent_runtime: agentRuntime })
  }
}
