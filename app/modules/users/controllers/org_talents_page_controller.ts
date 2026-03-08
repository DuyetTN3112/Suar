import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { mapProfileViewPageProps } from './mappers/response/user_response_mapper.js'

import { omitUndefined } from '#modules/contracts/public_contracts/optional_payload'
import {
  actionContextFromHttp,
  resolveCurrentOrganizationId,
} from '#modules/http/boundary/http_execution_context'
import { normalizePagination } from '#modules/pagination/public_contracts/pagination_public_api'
import { USER_PAGINATION } from '#modules/users/actions/dtos/common/user_pagination'
import { UserProfilePageQueryFactory } from '#modules/users/actions/ports/inbound/user_profile_page_query_factory'
import { UserTalentQueryFactory } from '#modules/users/actions/ports/inbound/user_talent_query_factory'
import GetTalentDirectoryOptionsQuery from '#modules/users/actions/queries/get_talent_directory_options_query'
import RecruitingDirectoryAccessQuery from '#modules/users/actions/queries/recruiting_directory_access_query'

@inject()
export default class OrgTalentsPageController {
  constructor(
    private readonly recruitingAccess: RecruitingDirectoryAccessQuery,
    private readonly directoryOptions: GetTalentDirectoryOptionsQuery,
    private readonly profilePages: UserProfilePageQueryFactory,
    private readonly talentQueries: UserTalentQueryFactory
  ) {}

  async index(ctx: HttpContext) {
    const organizationId = resolveCurrentOrganizationId(ctx)
    const userId = ctx.auth.user?.id

    if (!organizationId || !userId) {
      ctx.session.flash('error', 'Bạn cần chọn tổ chức trước khi xem danh bạ talent.')
      ctx.response.redirect('/marketplace/tasks')
      return
    }

    const canAccess = await this.recruitingAccess.canAccess(organizationId, userId)
    if (!canAccess) {
      ctx.session.flash('error', 'Danh bạ talent chỉ dành cho người quản lý trong tổ chức.')
      ctx.response.redirect('/marketplace/tasks')
      return
    }

    const q = ctx.request.input('q') as unknown
    const taskId =
      (ctx.request.input('taskId') as unknown) ?? (ctx.request.input('task_id') as unknown)
    const skillCategoriesInput =
      (ctx.request.input('skillCategories') as unknown) ??
      (ctx.request.input('skill_categories') as unknown)
    const skillIdsInput =
      (ctx.request.input('skillIds') as unknown) ?? (ctx.request.input('skill_ids') as unknown)
    const businessDomain =
      (ctx.request.input('businessDomain') as unknown) ??
      (ctx.request.input('business_domain') as unknown)
    const taskType =
      (ctx.request.input('taskType') as unknown) ?? (ctx.request.input('task_type') as unknown)
    const problemCategory =
      (ctx.request.input('problemCategory') as unknown) ??
      (ctx.request.input('problem_category') as unknown)
    const roleInTask =
      (ctx.request.input('roleInTask') as unknown) ?? (ctx.request.input('role_in_task') as unknown)
    const techStack =
      (ctx.request.input('techStack') as unknown) ?? (ctx.request.input('tech_stack') as unknown)
    const domainTags =
      (ctx.request.input('domainTags') as unknown) ?? (ctx.request.input('domain_tags') as unknown)
    const sortBy =
      (ctx.request.input('sortBy') as unknown) ?? (ctx.request.input('sort_by') as unknown)
    const sortOrder =
      (ctx.request.input('sortOrder') as unknown) ?? (ctx.request.input('sort_order') as unknown)
    const savedInput = ctx.request.input('saved') as unknown
    const minTrustScoreInput =
      (ctx.request.input('minTrustScore') as unknown) ??
      (ctx.request.input('min_trust_score') as unknown)
    const minCompletedTasksInput =
      (ctx.request.input('minCompletedTasks') as unknown) ??
      (ctx.request.input('min_completed_tasks') as unknown)
    const toOptionalNumber = (value: unknown): number | undefined => {
      if (typeof value !== 'string' && typeof value !== 'number') {
        return undefined
      }

      const parsed = Number(value)
      return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined
    }
    const toOptionalStringArray = (value: unknown): string[] | null => {
      const values = Array.isArray(value)
        ? value
        : typeof value === 'string'
          ? value.split(',')
          : []
      const normalized = values
        .map((item) => (typeof item === 'string' ? item.trim() : ''))
        .filter((item) => item.length > 0)

      return normalized.length > 0 ? normalized : null
    }
    const toOptionalString = (value: unknown): string | undefined =>
      typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined
    const toTalentSortBy = (
      value: unknown
    ): 'relevance' | 'trust_score' | 'completed_tasks' | 'name' =>
      value === 'trust_score' || value === 'completed_tasks' || value === 'name'
        ? value
        : 'relevance'
    const toTalentSortOrder = (value: unknown): 'asc' | 'desc' => (value === 'asc' ? 'asc' : 'desc')
    const pagination = normalizePagination(
      {
        page: ctx.request.input('page'),
        perPage:
          (ctx.request.input('perPage') as unknown) ??
          (ctx.request.input('per_page') as unknown) ??
          (ctx.request.input('limit') as unknown),
      },
      USER_PAGINATION
    )

    const [result, options] = await Promise.all([
      this.talentQueries.makeDirectoryPage(actionContextFromHttp(ctx)).handle(
        omitUndefined({
          q: toOptionalString(q),
          task_id: toOptionalString(taskId),
          skill_categories: toOptionalStringArray(skillCategoriesInput),
          skill_ids: toOptionalStringArray(skillIdsInput),
          business_domain: toOptionalString(businessDomain),
          task_type: toOptionalString(taskType),
          problem_category: toOptionalString(problemCategory),
          role_in_task: toOptionalString(roleInTask),
          tech_stack: toOptionalString(techStack),
          domain_tags: toOptionalString(domainTags),
          sort_by: toTalentSortBy(sortBy),
          sort_order: toTalentSortOrder(sortOrder),
          saved: savedInput === true || savedInput === 'true' ? true : undefined,
          min_trust_score: toOptionalNumber(minTrustScoreInput),
          min_completed_tasks: toOptionalNumber(minCompletedTasksInput),
          page: pagination.page,
          per_page: pagination.perPage,
        })
      ),
      this.directoryOptions.execute(organizationId),
    ])

    return ctx.inertia.render('talents/index', { ...result, ...options })
  }

  async show(ctx: HttpContext) {
    const organizationId = resolveCurrentOrganizationId(ctx)
    const userId = ctx.auth.user?.id

    if (!organizationId || !userId) {
      ctx.session.flash('error', 'Bạn cần chọn tổ chức trước khi xem thông tin talent.')
      ctx.response.redirect('/marketplace/tasks')
      return
    }

    const canAccess = await this.recruitingAccess.canAccess(organizationId, userId)
    if (!canAccess) {
      ctx.session.flash('error', 'Chi tiết talent chỉ dành cho người quản lý trong tổ chức.')
      ctx.response.redirect('/marketplace/tasks')
      return
    }

    const targetUserId = ctx.params['userId'] as string

    const result = await this.profilePages.makeView(actionContextFromHttp(ctx)).execute({
      userId: targetUserId,
      currentUserId: userId,
    })

    return ctx.inertia.render('talents/show', mapProfileViewPageProps(result))
  }
}
