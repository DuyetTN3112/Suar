import type { HttpContext } from '@adonisjs/core/http'

import { marketplaceCompositionRoot } from '../bootstrap/marketplace_composition_root.js'

import { buildGetMarketplaceTasksDTO } from './mappers/request/marketplace_task_request_mapper.js'
import { mapMarketplaceTasksPageProps } from './mappers/response/marketplace_task_response_mapper.js'
import { normalizeMarketplaceTaskSortForActor } from './support/marketplace_task_sort_policy.js'

import { actionContextFromHttp } from '#modules/http/public_contracts/http_execution_context'
import { skillPublicApi } from '#modules/skills/public_contracts/skill_public_api'

/**
 * GET /marketplace/tasks - marketplace-owned public task listing page.
 */
export default class ListMarketplaceTasksController {
  async handle(ctx: HttpContext) {
    const execCtx = actionContextFromHttp(ctx)
    const dto = await normalizeMarketplaceTaskSortForActor(
      buildGetMarketplaceTasksDTO(ctx.request),
      execCtx
    )
    const query = marketplaceCompositionRoot.makeGetMarketplaceTasksQuery(execCtx)
    const [result, availableSkills] = await Promise.all([query.handle(dto), skillPublicApi.listActive()])

    const pageName = ctx.request.url().startsWith('/org/')
      ? 'org/marketplace/tasks'
      : 'marketplace/tasks'

    return ctx.inertia.render(
      pageName,
      {
        ...mapMarketplaceTasksPageProps(result, {
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
      }
    )
  }
}
