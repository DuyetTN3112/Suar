import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { readTalentDirectoryRequest } from '../mappers/request/talent/talent_directory_request_mapper.js'
import { mapProfileViewPageProps } from '../mappers/response/profile/user_response_mapper.js'

import {
  actionContextFromHttp,
  resolveCurrentOrganizationId,
} from '#modules/http/boundary/http_execution_context'
import { SearchDiscoveryError } from '#modules/search/public_contracts/search_discovery_contract'
import { TalentDiscoveryRequestError } from '#modules/users/actions/mappers/talent-discovery/talent_discovery_request_builder'
import { UserTalentQueryFactory } from '#modules/users/actions/ports/inbound/user_talent_query_factory'

function canUseDirectoryFallback(error: unknown): boolean {
  const isKnownSearchFailure =
    error instanceof SearchDiscoveryError &&
    ['SEARCH_SOURCE_UNAVAILABLE', 'SEARCH_SOURCE_TIMED_OUT', 'SEARCH_INDEX_DISABLED', 'SEARCH_INDEX_STALE'].includes(error.code)
  if (isKnownSearchFailure) return true

  if (error instanceof TalentDiscoveryRequestError) return true

  if (!(error instanceof Error)) return false

  return /ECONNREFUSED|ECONNRESET|ETIMEDOUT|search provider|elasticsearch/i.test(
    `${error.name} ${error.message}`
  )
}

@inject()
export default class OrgTalentsPageController {
  constructor(private readonly talentQueries: UserTalentQueryFactory) {}

  /**
   * Talent detail is an organization-management surface. Search can be entered
   * from a project workspace, so leave that workspace explicitly before opening
   * the detail page while preserving the resolved organization context.
   */
  async open(ctx: HttpContext) {
    const organizationId = resolveCurrentOrganizationId(ctx)
    if (!organizationId) {
      ctx.session.flash('error', 'Hãy chọn tổ chức trước khi xem chi tiết talent.')
      ctx.response.redirect('/organizations')
      return
    }

    const userId = ctx.params['userId'] as string
    ctx.session.put('current_organization_id', organizationId)
    ctx.session.forget('current_project_id')
    await ctx.session.commit()

    ctx.response.redirect(`/org/talents/${encodeURIComponent(userId)}`)
  }

  async index(ctx: HttpContext) {
    const request = readTalentDirectoryRequest(ctx.request)
    const cursor = ctx.request.input('cursor') as string | undefined
    const actionContext = actionContextFromHttp(ctx)

    let result
    try {
      result = await this.talentQueries
        .makeRecruitingTalentDiscoveryPage(actionContext)
        .executeAndWrap(request, cursor)
    } catch (error) {
      if (!canUseDirectoryFallback(error)) throw error

      return ctx.inertia.render(
        'talents/index',
        await this.talentQueries.makeRecruitingDirectoryWorkspace(actionContext).handle(request)
      )
    }

    if (result.isFailure()) {
      ctx.session.flash('error', 'Danh bạ talent chỉ dành cho người quản lý trong tổ chức.')
      ctx.response.redirect('/marketplace/tasks')
      return
    }

    return ctx.inertia.render('talents/index', result.getValue())
  }

  async show(ctx: HttpContext) {
    const result = await this.talentQueries
      .makeRecruitingTalentProfile(actionContextFromHttp(ctx))
      .executeAndWrap({ userId: ctx.params['userId'] as string })

    if (result.isFailure()) {
      ctx.session.flash('error', 'Chi tiết talent chỉ dành cho người quản lý trong tổ chức.')
      ctx.response.redirect('/marketplace/tasks')
      return
    }

    return ctx.inertia.render('talents/show', mapProfileViewPageProps(result.getValue()))
  }
}
