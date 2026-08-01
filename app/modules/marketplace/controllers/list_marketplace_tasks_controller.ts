import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'


import { buildGetMarketplaceTasksDTO } from './mappers/request/marketplace_task_request_mapper.js'
import { mapMarketplaceTasksPageProps } from './mappers/response/marketplace_task_response_mapper.js'

import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { MarketplaceActionFactory } from '#modules/marketplace/actions/ports/inbound/marketplace_action_factory'

/**
 * GET /marketplace/tasks - marketplace-owned public task listing page.
 */
@inject()
export default class ListMarketplaceTasksController {
  constructor(private readonly actions: MarketplaceActionFactory) {}

  async handle(ctx: HttpContext) {
    const execCtx = actionContextFromHttp(ctx)
    const dto = buildGetMarketplaceTasksDTO(ctx.request)
    const query = this.actions.makeGetMarketplaceTasksPageQuery(execCtx)
    const { listing, availableSkills } = await query.handle(dto)

    const pageName = ctx.request.url().startsWith('/org/')
      ? 'org/marketplace/tasks'
      : 'marketplace/tasks'

    return ctx.inertia.render(pageName, {
      ...mapMarketplaceTasksPageProps(listing, {
        skill_categories: dto.skill_categories ?? null,
        skill_ids: dto.skill_ids ?? null,
        keyword: dto.keyword ?? null,
        difficulty: dto.difficulty ?? null,
        task_type: dto.task_type ?? null,
        business_domain: dto.business_domain ?? null,
        problem_category: dto.problem_category ?? null,
        role_in_task: dto.role_in_task ?? null,
        verification_method: dto.verification_method ?? null,
        tech_stack: dto.tech_stack ?? null,
        domain_tags: dto.domain_tags ?? null,
        accepting_applications: dto.accepting_applications ?? null,
        sort_by: dto.sort_by,
        sort_order: dto.sort_order,
      }),
      availableSkills,
    })
  }
}
