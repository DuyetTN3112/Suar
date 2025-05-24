import { HttpContext } from '@adonisjs/core/http'
import Organization from '#models/organization'
import db from '@adonisjs/lucid/services/db'
// import User from '#models/user'

export default class OrganizationMiddleware {
  async handle(
    {
      session,
      auth,
      // response
    }: HttpContext,
    next: () => Promise<void>
  ) {
    // Kiểm tra người dùng đã đăng nhập chưa
    if (!auth.isAuthenticated) {
      return next()
    }
    const user = auth.user!
    // Removed debug log: console.log('OrganizationMiddleware - User ID:', user.id)
    // Lấy tổ chức hiện tại từ session và từ user model
    const sessionOrgId = session.get('current_organization_id')
    const userOrgId = user.current_organization_id
    // Removed debug logs: console.log statements for session and user org IDs
    // Xử lý trường hợp không có tổ chức trong cả session và user model
    if (!sessionOrgId && !userOrgId) {
      // Removed debug log: console.log('OrganizationMiddleware - Không tìm thấy tổ chức hiện tại trong cả session và user object')
      // Lấy tổ chức đầu tiên của người dùng
      const userOrganization = await db
        .from('organization_users')
        .where('user_id', user.id)
        .join('organizations', 'organizations.id', '=', 'organization_users.organization_id')
        .whereNull('organizations.deleted_at')
        .select('organizations.id')
        .first()
      if (userOrganization) {
        const firstOrgId = userOrganization.id
        // Removed debug log: console.log('OrganizationMiddleware - Tìm thấy tổ chức mặc định:', firstOrgId)
        // Cập nhật cả session và user model
        session.put('current_organization_id', firstOrgId)
        await session.commit()
        try {
          await user.merge({ current_organization_id: firstOrgId }).save()
          // Removed debug log: console.log('OrganizationMiddleware - Đã lưu current_organization_id vào user model')
        } catch (error) {
          console.error(
            'OrganizationMiddleware - Lỗi khi lưu current_organization_id vào user model:',
            error
          )
        }
      }
    }
    // Xử lý trường hợp có sự khác biệt giữa session và user model
    else if (sessionOrgId !== userOrgId) {
      // Removed debug log: console.log('OrganizationMiddleware - Phát hiện sự không đồng bộ giữa session và user model')
      // Ưu tiên giá trị từ session nếu có
      if (sessionOrgId) {
        try {
          // Removed debug log: console.log('OrganizationMiddleware - Đồng bộ từ session vào user model:', sessionOrgId)
          await user.merge({ current_organization_id: sessionOrgId }).save()
        } catch (error) {
          console.error('OrganizationMiddleware - Lỗi khi cập nhật user model:', error)
        }
      }
      // Nếu không có session nhưng có userOrgId thì cập nhật session
      else if (userOrgId) {
        // Removed debug log: console.log('OrganizationMiddleware - Đồng bộ từ user model vào session:', userOrgId)
        session.put('current_organization_id', userOrgId)
        await session.commit()
      }
    }
    // Tiếp tục kiểm tra tính hợp lệ của tổ chức hiện tại (nếu có)
    const currentOrganizationId =
      session.get('current_organization_id') || user.current_organization_id
    if (currentOrganizationId) {
      // Kiểm tra tổ chức có tồn tại không
      const organization = await Organization.find(currentOrganizationId)
      if (!organization) {
        console.error('OrganizationMiddleware - Organization not found:', currentOrganizationId)
        session.forget('current_organization_id')
        await session.commit()
        await user.merge({ current_organization_id: null }).save()
      } else {
        // Kiểm tra người dùng có quyền truy cập tổ chức không
        const hasAccess = await db
          .from('organization_users')
          .where('organization_id', organization.id)
          .where('user_id', user.id)
          .first()
        if (!hasAccess) {
          console.error(
            'OrganizationMiddleware - User has no access to organization:',
            currentOrganizationId
          )
          session.forget('current_organization_id')
          await session.commit()
          await user.merge({ current_organization_id: null }).save()
        }
      }
    }
    return next()
  }
}
