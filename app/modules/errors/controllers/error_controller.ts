import type { HttpContext } from '@adonisjs/core/http'

import { omitUndefined } from '#modules/contracts/public_contracts/optional_payload'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import { ORGANIZATION_PAGINATION } from '#modules/organizations/application/dtos/common/organization_pagination'
import { getOrganizationsMembershipDirectoryPage } from '#modules/organizations/public_contracts/organization_directory'
import { toCanonicalPagePagination } from '#modules/pagination/public_contracts/pagination_public_api'

function toPositiveNumber(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(1, Math.trunc(value))
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) {
      return Math.max(1, Math.trunc(parsed))
    }
  }

  return fallback
}

function toOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined
}

export default class ErrorController {
  /**
   * Hiển thị trang 404 Not Found
   */
  async notFound({ inertia, session }: HttpContext) {
    const flashError: unknown = session.flashMessages.get('error')

    return inertia.render('errors/not_found', {
      message: typeof flashError === 'string' ? flashError : 'Không tìm thấy trang',
    })
  }

  /**
   * Hiển thị trang yêu cầu tham gia tổ chức
   */
  async requireOrganization({ inertia, auth, request }: HttpContext) {
    if (!auth.user) {
      throw new UnauthorizedException()
    }

    const search = toOptionalString(request.input('search') as unknown)
    const page = toPositiveNumber(
      request.input('page', ORGANIZATION_PAGINATION.DEFAULT_PAGE) as unknown,
      ORGANIZATION_PAGINATION.DEFAULT_PAGE
    )
    const result = await getOrganizationsMembershipDirectoryPage(omitUndefined({
      userId: auth.user.id,
      page,
      perPage: ORGANIZATION_PAGINATION.DEFAULT_PER_PAGE,
      search,
    }))

    return inertia.render('errors/require_organization', {
      organizations: result.data,
      pagination: toCanonicalPagePagination(result.meta),
      filters: {
        search: search ?? '',
      },
    })
  }

  /**
   * Hiển thị trang lỗi server
   */
  async serverError({ inertia }: HttpContext) {
    return inertia.render('errors/server_error', {})
  }

  /**
   * Hiển thị trang không có quyền truy cập
   */
  async forbidden({ inertia }: HttpContext) {
    return inertia.render('errors/forbidden', {})
  }
}
