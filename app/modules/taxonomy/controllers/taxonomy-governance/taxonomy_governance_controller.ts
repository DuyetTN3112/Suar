import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { wrapApiV1Data } from '#modules/http/boundary/api_v1_response'
import { TaxonomyGovernanceActionFactory } from '#modules/taxonomy/actions/ports/inbound/taxonomy-governance/taxonomy_governance_action_factory'
import {
  buildTaxonomyGovernanceApplyRequest,
  buildTaxonomyGovernancePreviewRequest,
  buildTaxonomyGovernanceStatusRequest,
} from '#modules/taxonomy/controllers/mappers/request/taxonomy-governance/taxonomy_governance_request_mapper'

@inject()
export default class TaxonomyGovernanceController {
  constructor(private readonly actions: TaxonomyGovernanceActionFactory) {}

  async page(ctx: HttpContext) {
    return ctx.inertia.render('admin/taxonomy_governance/index', {})
  }

  async preview(ctx: HttpContext) {
    const input = buildTaxonomyGovernancePreviewRequest(ctx.request.body())
    const result = await this.actions.governance.previewAndStartAndWrap(input, new Date().toISOString())
    const value = result.getValue()
    return ctx.response.status(201).json(
      wrapApiV1Data({ ...value.preview, run: value.run })
    )
  }

  async status(ctx: HttpContext) {
    const { planToken } = buildTaxonomyGovernanceStatusRequest(ctx.params)
    const result = await this.actions.governance.statusAndWrap(planToken)
    const value = result.getValue()
    if (value === null) return ctx.response.status(404).json(wrapApiV1Data(null))
    return ctx.response.status(200).json(
      wrapApiV1Data({
        planToken: value.plan.planToken,
        status: value.status,
        lockVersion: value.lockVersion,
        completedItemIds: value.completedItemIds,
        nextCursor: value.nextCursor,
        expectedVersion: value.expectedVersion,
        createdAt: value.createdAt,
        updatedAt: value.updatedAt,
        publishedAt: value.publishedAt,
      })
    )
  }

  async apply(ctx: HttpContext) {
    const input = buildTaxonomyGovernanceApplyRequest(ctx.params, ctx.request.body())
    const result = await this.actions.governance.applyAndWrap({ ...input, now: new Date().toISOString() })
    return ctx.response.status(200).json(wrapApiV1Data(result.getValue()))
  }
}
