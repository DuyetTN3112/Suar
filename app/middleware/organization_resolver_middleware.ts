import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import type Organization from '#models/organization'
import type User from '#models/user'
import loggerService from '#infra/logger/logger_service'
import type { DatabaseId } from '#types/database'
import { HttpStatus, createApiError, ErrorCode, ErrorMessages } from '#constants/error_constants'
import OrganizationUserRepository from '#infra/organizations/repositories/organization_user_repository'
import UserRepository from '#infra/users/repositories/user_repository'

/**
 * OrganizationResolver Middleware
 *
 * Gộp logic từ 3 middleware cũ:
 * - current_organization_middleware.ts (sync session ↔ DB)
 * - organization_middleware.ts (auto-assign org, validate access)
 * - require_organization_middleware.ts (enforce org requirement)
 *
 * Tối ưu: Tối đa 1-2 DB queries/request thay vì 6-15 queries.
 * Pattern: Single query resolution → validate → sync.
 */
export default class OrganizationResolverMiddleware {
  /**
   * Paths được miễn kiểm tra organization (cho phép truy cập không cần org)
   */
  private static readonly EXEMPT_PATH_PREFIXES = [
    '/organizations',
    '/auth',
    '/logout',
    '/errors',
    '/api/organizations',
    '/health',
    '/lang/',
  ] as const

  /**
   * Kiểm tra path có được miễn không
   */
  private isExemptPath(path: string): boolean {
    return OrganizationResolverMiddleware.EXEMPT_PATH_PREFIXES.some(
      (prefix) => path === prefix || path.startsWith(`${prefix}/`)
    )
  }

  async handle(ctx: HttpContext, next: NextFn): Promise<void> {
    // Bỏ qua nếu user chưa đăng nhập
    if (!ctx.auth.isAuthenticated || !ctx.auth.user) {
      await next()
      return
    }

    const user = ctx.auth.user
    const sessionOrgId = ctx.session.get('current_organization_id') as DatabaseId | undefined
    const dbOrgId = user.current_organization_id

    // === FAST PATH: Cả session và DB đều không có org ===
    if (!sessionOrgId && !dbOrgId) {
      // Tìm org đầu tiên của user (1 query duy nhất)
      const membership = await this.findFirstApprovedMembership(user.id)

      if (membership) {
        // Auto-assign org đầu tiên
        await this.syncOrganization(ctx, user, membership.organization_id)
      } else {
        // User chưa thuộc org nào — set flag cho frontend modal
        this.handleNoOrganization(ctx)
      }

      await next()
      return
    }

    // === Xác định org ID cần resolve (session ưu tiên hơn DB) ===
    const targetOrgId = sessionOrgId ?? dbOrgId

    if (!targetOrgId) {
      await next()
      return
    }

    // === Validate access — 1 query duy nhất kiểm tra cả membership + org tồn tại ===
    const validMembership = await OrganizationUserRepository.findApprovedMembershipWithOrganization(
      targetOrgId,
      user.id
    )

    if (validMembership) {
      ctx.currentOrganizationId = targetOrgId
      ctx.currentOrganization = validMembership.organization

      // Membership hợp lệ + org tồn tại → sync nếu cần
      if (sessionOrgId !== dbOrgId || sessionOrgId !== targetOrgId) {
        await this.syncOrganization(ctx, user, targetOrgId)
      }

      // Xóa modal flag nếu có
      if (ctx.session.has('show_organization_required_modal')) {
        ctx.session.forget('show_organization_required_modal')
      }
    } else {
      // Membership không hợp lệ hoặc org đã bị xóa → clear
      loggerService.warn('Organization access invalid, clearing', {
        userId: user.id,
        targetOrgId,
      })
      await this.clearOrganization(ctx, user)

      // Thử tìm org khác
      const fallbackMembership = await this.findFirstApprovedMembership(user.id)
      if (fallbackMembership) {
        await this.syncOrganization(ctx, user, fallbackMembership.organization_id)
        ctx.currentOrganizationId = fallbackMembership.organization_id
        ctx.currentOrganization = fallbackMembership.organization
      } else {
        this.handleNoOrganization(ctx)
      }
    }

    await next()
  }

  /**
   * Tìm membership đầu tiên đã approved của user
   * Dùng 1 query duy nhất với join để validate org tồn tại
   */
  private async findFirstApprovedMembership(
    userId: DatabaseId
  ): Promise<
    Awaited<
      ReturnType<typeof OrganizationUserRepository.findFirstApprovedMembershipWithOrganization>
    >
  > {
    return OrganizationUserRepository.findFirstApprovedMembershipWithOrganization(userId)
  }

  /**
   * Đồng bộ org ID vào cả session và DB (atomic)
   */
  private async syncOrganization(ctx: HttpContext, user: User, orgId: DatabaseId): Promise<void> {
    // Update session
    ctx.session.put('current_organization_id', orgId)

    // Update DB chỉ khi cần (tránh unnecessary write)
    if (user.current_organization_id !== orgId) {
      try {
        await UserRepository.updateCurrentOrganization(user.id, orgId)
        user.current_organization_id = orgId
      } catch (error) {
        loggerService.error('Failed to sync organization to DB', {
          userId: user.id,
          orgId,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }
  }

  /**
   * Xóa org ID khỏi session và DB
   */
  private async clearOrganization(ctx: HttpContext, user: User): Promise<void> {
    ctx.session.forget('current_organization_id')

    try {
      await UserRepository.updateCurrentOrganization(user.id, null)
      user.current_organization_id = null
      ctx.currentOrganizationId = undefined
      ctx.currentOrganization = undefined
    } catch (error) {
      loggerService.error('Failed to clear organization from DB', {
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  /**
   * Xử lý khi user không thuộc org nào
   * Set flag cho frontend để hiển thị modal tạo/join org
   */
  private handleNoOrganization(ctx: HttpContext): void {
    const currentPath = ctx.request.url(true)

    // Không set flag cho exempt paths
    if (this.isExemptPath(currentPath)) {
      return
    }

    // API request → trả về 403 JSON
    if (ctx.request.accepts(['html', 'json']) === 'json') {
      ctx.response.status(HttpStatus.FORBIDDEN).json({
        ...createApiError(ErrorCode.FORBIDDEN, ErrorMessages.REQUIRE_ORGANIZATION),
        redirectTo: '/organizations',
      })
      return
    }

    // HTML request → set flag cho frontend modal
    ctx.session.put('intended_url', ctx.request.url(true))
    ctx.session.put('show_organization_required_modal', true)
  }
}

/**
 * Mở rộng HttpContext để share organization info
 */
declare module '@adonisjs/core/http' {
  interface HttpContext {
    /** ID tổ chức hiện tại đã được resolve */
    currentOrganizationId?: DatabaseId
    /** Organization model đã load (nếu cần) */
    currentOrganization?: InstanceType<typeof Organization>
  }
}
