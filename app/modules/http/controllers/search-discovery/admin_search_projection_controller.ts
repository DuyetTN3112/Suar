import {
  buildAdminSearchProjectionActivationApplyRequest,
  buildAdminSearchProjectionActivationPreviewRequest,
  buildAdminSearchProjectionCleanupApplyRequest,
  buildAdminSearchProjectionCleanupPreviewRequest,
  buildAdminSearchProjectionInspectRequest,
  buildAdminSearchProjectionReconcileRequest,
  buildAdminSearchProjectionRollbackApplyRequest,
  buildAdminSearchProjectionRollbackPreviewRequest,
} from '../mappers/request/search-discovery/admin_search_projection_request_mapper.js'
import {
  isSearchIndexAdministrationError,
  mapProjectionInventories,
  type AdminSearchProjectionDependencies,
  toHttpException,
  unsupportedOperation,
} from '../mappers/request/search-discovery/admin_search_projection_controller_mapper.js'

export type { AdminSearchProjectionDependencies } from '../mappers/request/search-discovery/admin_search_projection_controller_mapper.js'

import AppException from '#modules/errors/public_contracts/application_exception'

type HttpContext = {
  auth: { user?: { id: string } | null }
  request: { input(key: string, fallback?: unknown): unknown; body(): unknown }
  response: { status(statusCode: number): { json(payload: unknown): unknown }; json(payload: unknown): unknown }
  inertia: { render(view: string, props: unknown): unknown }
}

export default class AdminSearchProjectionController {
  constructor(private readonly dependencies: AdminSearchProjectionDependencies) {}

  private actorId(ctx: HttpContext): string {
    const id = ctx.auth.user?.id
    if (!id) {
      throw new AppException('Authentication required.', {
        status: 401,
        code: 'AUTHENTICATION_REQUIRED',
        safeMessage: 'Authentication required.',
      })
    }
    return id
  }

  private async authorize(ctx: HttpContext): Promise<void> {
    const actor = await this.dependencies.authorize.handle({ assertedActorId: this.actorId(ctx) })
    if (!actor) {
      throw new AppException('Not authorized.', {
        status: 403,
        code: 'FORBIDDEN',
        safeMessage: 'Not authorized.',
      })
    }
  }

  private async run<T>(ctx: HttpContext, action: () => Promise<T>): Promise<T> {
    void ctx
    try {
      return await action()
    } catch (error) {
      if (error instanceof AppException) throw error
      if (isSearchIndexAdministrationError(error)) throw toHttpException(error)
      throw error
    }
  }

  private json(ctx: HttpContext, data: unknown) {
    return ctx.response.status(200).json({ data })
  }

  async index(ctx: HttpContext) {
    return this.run(ctx, async () => {
      await this.authorize(ctx)
      const target = ctx.request.input('target')
      const result = await this.dependencies.inspect.handle(buildAdminSearchProjectionInspectRequest({ target }))
      return this.json(ctx, result)
    })
  }

  async page(ctx: HttpContext) {
    return this.run(ctx, async () => {
      await this.authorize(ctx)
      const result = await this.dependencies.inspect.handle({})
      return ctx.inertia.render('admin/search_projections/index', { snapshot: mapProjectionInventories(result) })
    })
  }

  async previewCleanup(ctx: HttpContext) {
    return this.run(ctx, async () => {
      await this.authorize(ctx)
      const input = Object.fromEntries(['target', 'retainRetired', 'olderThanHours'].map((key) => [key, ctx.request.input(key)]))
      return this.json(ctx, await this.dependencies.previewCleanup.handle(buildAdminSearchProjectionCleanupPreviewRequest(input)))
    })
  }

  async applyCleanup(ctx: HttpContext) {
    return this.run(ctx, async () => {
      await this.authorize(ctx)
      return this.json(ctx, await this.dependencies.applyCleanup.handle(buildAdminSearchProjectionCleanupApplyRequest(ctx.request.body())))
    })
  }

  async previewRollback(ctx: HttpContext) {
    return this.run(ctx, async () => {
      await this.authorize(ctx)
      const input = Object.fromEntries(
        ['target', 'expectedCurrentIndexName', 'rollbackIndexName', 'allowEmpty'].map((key) => [key, ctx.request.input(key)])
      )
      return this.json(ctx, await this.dependencies.previewRollback.handle(buildAdminSearchProjectionRollbackPreviewRequest(input)))
    })
  }

  async applyRollback(ctx: HttpContext) {
    return this.run(ctx, async () => {
      await this.authorize(ctx)
      return this.json(ctx, await this.dependencies.applyRollback.handle(buildAdminSearchProjectionRollbackApplyRequest(ctx.request.body())))
    })
  }

  async previewActivation(ctx: HttpContext) {
    return this.run(ctx, async () => {
      await this.authorize(ctx)
      if (!this.dependencies.previewActivation) throw unsupportedOperation('previewActivation')
      const input = buildAdminSearchProjectionActivationPreviewRequest({ id: ctx.request.input('id') })
      return this.json(ctx, await this.dependencies.previewActivation.handle(input))
    })
  }

  async applyActivation(ctx: HttpContext) {
    return this.run(ctx, async () => {
      await this.authorize(ctx)
      if (!this.dependencies.applyActivation) throw unsupportedOperation('applyActivation')
      return this.json(ctx, await this.dependencies.applyActivation.handle(buildAdminSearchProjectionActivationApplyRequest(ctx.request.body())))
    })
  }

  async reconcile(ctx: HttpContext) {
    return this.run(ctx, async () => {
      await this.authorize(ctx)
      if (!this.dependencies.reconcile) throw unsupportedOperation('reconcile')
      return this.json(ctx, await this.dependencies.reconcile.handle(buildAdminSearchProjectionReconcileRequest(ctx.request.body())))
    })
  }

  rebuild(_ctx: HttpContext) {
    throw unsupportedOperation('rebuild')
  }

  abort(_ctx: HttpContext) {
    throw unsupportedOperation('abort')
  }
}
