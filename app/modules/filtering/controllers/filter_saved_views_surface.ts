import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import AppException from '#modules/errors/public_contracts/application_exception'
import { FilteringActionFactory } from '#modules/filtering/actions/ports/inbound/filtering_action_factory'
import { filteringPrincipalFromHttp } from '#modules/filtering/controllers/filtering_http_principal'
import {
  buildCreateFilterAlertRequest,
  buildCreateSavedFilterViewRequest,
  buildDeleteSavedFilterViewRequest,
  buildDuplicateSavedFilterViewRequest,
  buildListSavedFilterViewsRequest,
  buildSavedFilterViewRouteRequest,
  buildShareSavedFilterViewRequest,
  buildUpdateFilterAlertRequest,
  buildUpdateSavedFilterViewRequest,
} from '#modules/filtering/controllers/mappers/request/saved-filter-views/filter_saved_view_request_mapper'
import { FilterAlertPolicyError } from '#modules/filtering/domain/filter-alert/filter_alert_policy'
import {
  FilterSavedViewAccessError,
  FilterSavedViewRepositoryError,
} from '#modules/filtering/public_contracts/filter_saved_view_errors'

interface SavedFilterSemanticRuntime {
  readonly textQuery: string | null
  readonly filter: unknown
  readonly sort: readonly { readonly field: string; readonly direction: 'asc' | 'desc' }[]
  readonly projection: readonly string[]
}

interface SavedFilterViewRuntime {
  readonly id: string
  readonly name: string
  readonly description: string | null
  readonly ownerId: string
  readonly visibility: 'private' | 'team' | 'organization'
  readonly organizationId: string | null
  readonly teamId: string | null
  readonly context: { readonly key: string; readonly owner: string; readonly schemaVersion: number }
  readonly semanticState: SavedFilterSemanticRuntime
  readonly presentationState: Record<string, unknown>
  readonly isDefault: boolean
  readonly isPinned: boolean
  readonly alertState: { readonly status: 'disabled' | 'active' | 'paused'; readonly reason: string | null }
  readonly createdAt: string
  readonly updatedAt: string
}

interface SavedFilterViewRecordRuntime {
  readonly owner: { readonly id: string }
  readonly view: SavedFilterViewRuntime
  readonly lockVersion: number
  readonly migrationState: 'current' | 'pending' | 'requires_repair' | 'blocked'
}

interface FilterAlertRecordRuntime {
  readonly alert: {
    readonly id: string
    readonly savedViewId: string
    readonly status: 'active' | 'paused'
    readonly intervalMinutes: number
    readonly timezone: string
    readonly nextRunAt: string
    readonly lastSuccessfulAt: string | null
    readonly pauseReason: string | null
  }
  readonly lockVersion: number
}

interface WrappedResult<T> {
  getValue(): T
}

function viewResponse(record: SavedFilterViewRecordRuntime, principalId?: string) {
  const view = record.view
  const semantic = view.semanticState
  return {
    id: view.id,
    name: view.name,
    description: view.description,
    ownerId: view.ownerId,
    visibility: view.visibility,
    organizationId: view.organizationId,
    teamId: view.teamId,
    contextKey: view.context.key,
    contextOwner: view.context.owner,
    schemaVersion: view.context.schemaVersion,
    criteria: {
      context: view.context.key,
      schemaVersion: view.context.schemaVersion,
      ...(semantic.textQuery === null ? {} : { text: { value: semantic.textQuery } }),
      ...(semantic.filter === null ? {} : { filter: semantic.filter }),
      sort: semantic.sort,
      projection: semantic.projection,
      page: { size: 25 },
    },
    presentation: view.presentationState,
    isDefault: view.isDefault,
    isPinned: view.isPinned,
    alertStatus: view.alertState.status,
    alertReason: view.alertState.reason,
    lockVersion: record.lockVersion,
    migrationState: record.migrationState,
    canEdit: record.owner.id === principalId,
    canShare: record.owner.id === principalId,
    createdAt: view.createdAt,
    updatedAt: view.updatedAt,
  }
}

function alertResponse(record: FilterAlertRecordRuntime) {
  const { alert } = record
  return {
    id: alert.id,
    savedViewId: alert.savedViewId,
    status: alert.status,
    intervalMinutes: alert.intervalMinutes,
    timezone: alert.timezone,
    nextRunAt: alert.nextRunAt,
    lastSuccessfulAt: alert.lastSuccessfulAt,
    pauseReason: alert.pauseReason,
    lockVersion: record.lockVersion,
  }
}

function toHttpException(error: unknown): AppException | undefined {
  if (error instanceof AppException) return error
  if (error instanceof FilterSavedViewAccessError) {
    return new AppException(error.message, {
      status: 401,
      code: error.code,
      safeMessage: error.message,
    })
  }
  if (error instanceof FilterSavedViewRepositoryError) {
    const status = error.code === 'OPTIMISTIC_CONFLICT' ? 409 : error.code === 'CORRUPTED_PAYLOAD' || error.code === 'INVALID_PERSISTENCE_STATE' ? 500 : 422
    return new AppException(error.message, { status, code: error.code, safeMessage: error.message })
  }
  if (error instanceof FilterAlertPolicyError) {
    return new AppException(error.message, {
      status: 401,
      code: 'SAVED_FILTER_VIEW_UNAVAILABLE',
      safeMessage: error.message,
    })
  }
  return undefined
}

@inject()
export default class FilterSavedViewsController {
  constructor(private readonly actions: FilteringActionFactory) {}

  async index(ctx: HttpContext) {
    return this.run(async () => {
      const principal = filteringPrincipalFromHttp(ctx)
      const input = buildListSavedFilterViewsRequest(ctx.request.qs())
      const result = (await this.actions.listSavedFilterViews.executeAndWrap({ ...input, principal })) as unknown as WrappedResult<readonly SavedFilterViewRecordRuntime[]>
      const records = result.getValue()
      return { views: records.map((record) => viewResponse(record, principal.id)) }
    })
  }

  async store(ctx: HttpContext) {
    return this.run(async () => {
      const principal = filteringPrincipalFromHttp(ctx)
      const input = buildCreateSavedFilterViewRequest(ctx.request.body())
      const result = (await this.actions.createSavedFilterView.executeAndWrap({
        ...input,
        principal,
        owner: { type: 'user', id: principal.id ?? '' },
        context: { key: input.contextKey, owner: input.contextOwner, schemaVersion: input.schemaVersion },
        alertState: { status: 'disabled', reason: null },
      })) as unknown as WrappedResult<SavedFilterViewRecordRuntime>
      return ctx.response.status(201).json({ view: viewResponse(result.getValue(), principal.id) })
    })
  }

  async show(ctx: HttpContext) {
    return this.run(async () => {
      const principal = filteringPrincipalFromHttp(ctx)
      const { viewId } = buildSavedFilterViewRouteRequest(ctx.params)
      const result = (await this.actions.getSavedFilterView.executeAndWrap({
        principal,
        viewId,
      })) as unknown as WrappedResult<SavedFilterViewRecordRuntime>
      return { view: viewResponse(result.getValue(), principal.id) }
    })
  }

  async update(ctx: HttpContext) {
    return this.run(async () => {
      const principal = filteringPrincipalFromHttp(ctx)
      const input = buildUpdateSavedFilterViewRequest(ctx.request.body())
      const { viewId } = buildSavedFilterViewRouteRequest(ctx.params)
      const result = (await this.actions.updateSavedFilterView.executeAndWrap({
        ...input,
        principal,
        viewId,
      })) as unknown as WrappedResult<SavedFilterViewRecordRuntime>
      return { view: viewResponse(result.getValue(), principal.id) }
    })
  }

  async destroy(ctx: HttpContext) {
    return this.run(async () => {
      const principal = filteringPrincipalFromHttp(ctx)
      const input = buildDeleteSavedFilterViewRequest(ctx.request.body())
      const { viewId } = buildSavedFilterViewRouteRequest(ctx.params)
      await this.actions.deleteSavedFilterView.executeAndWrap({
        ...input,
        principal,
        viewId,
      })
      return ctx.response.noContent()
    })
  }

  async duplicate(ctx: HttpContext) {
    return this.run(async () => {
      const principal = filteringPrincipalFromHttp(ctx)
      const input = buildDuplicateSavedFilterViewRequest(ctx.request.body())
      const { viewId } = buildSavedFilterViewRouteRequest(ctx.params)
      const result = (await this.actions.duplicateSavedFilterView.executeAndWrap({
        ...input,
        principal,
        viewId,
      })) as unknown as WrappedResult<SavedFilterViewRecordRuntime>
      return ctx.response.status(201).json({ view: viewResponse(result.getValue(), principal.id) })
    })
  }

  async share(ctx: HttpContext) {
    return this.run(async () => {
      const principal = filteringPrincipalFromHttp(ctx)
      const input = buildShareSavedFilterViewRequest(ctx.request.body())
      const { viewId } = buildSavedFilterViewRouteRequest(ctx.params)
      const result = (await this.actions.shareSavedFilterView.executeAndWrap({
        ...input,
        principal,
        viewId,
      })) as unknown as WrappedResult<SavedFilterViewRecordRuntime>
      return { view: viewResponse(result.getValue(), principal.id) }
    })
  }

  async showAlert(ctx: HttpContext) {
    return this.run(async () => {
      const { viewId } = buildSavedFilterViewRouteRequest(ctx.params)
      const result = (await this.actions.getFilterAlert.executeAndWrap({
        principal: filteringPrincipalFromHttp(ctx),
        viewId,
      })) as unknown as WrappedResult<FilterAlertRecordRuntime>
      return { alert: alertResponse(result.getValue()) }
    })
  }

  async storeAlert(ctx: HttpContext) {
    return this.run(async () => {
      const principal = filteringPrincipalFromHttp(ctx)
      const input = buildCreateFilterAlertRequest(ctx.request.body())
      const { viewId } = buildSavedFilterViewRouteRequest(ctx.params)
      const result = (await this.actions.createFilterAlert.executeAndWrap({
        ...input,
        principal,
        viewId,
        alertId: this.actions.createRequestId(),
        now: new Date().toISOString(),
        policy: {
          hasSubscriptionPermission: true,
          contextAlertsEnabled: true,
          providerState: 'healthy',
          totalRelation: 'eq',
          queryCost: 0,
          maxQueryCost: 200,
        },
      })) as unknown as WrappedResult<FilterAlertRecordRuntime>
      return ctx.response.status(201).json({ alert: alertResponse(result.getValue()) })
    })
  }

  async updateAlert(ctx: HttpContext) {
    return this.run(async () => {
      const principal = filteringPrincipalFromHttp(ctx)
      const input = buildUpdateFilterAlertRequest(ctx.request.body())
      const { viewId } = buildSavedFilterViewRouteRequest(ctx.params)
      const result = (await this.actions.updateFilterAlert.executeAndWrap({
        ...input,
        principal,
        viewId,
        now: new Date().toISOString(),
      })) as unknown as WrappedResult<FilterAlertRecordRuntime | null>
      const value = result.getValue()
      return value === null ? ctx.response.noContent() : { alert: alertResponse(value) }
    })
  }

  private async run<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation()
    } catch (error) {
      const translated = toHttpException(error)
      if (translated !== undefined) throw translated
      throw error
    }
  }
}
