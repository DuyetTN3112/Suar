import { HttpContext } from '@adonisjs/core/http'
import Organization from '#models/organization'
import db from '@adonisjs/lucid/services/db'

export default class OrganizationMiddleware {
  async handle({ session, auth, response }: HttpContext, next: () => Promise<void>) {
    // Kiểm tra người dùng đã đăng nhập chưa
    if (!auth.isAuthenticated) {
      return next()
    }
    const user = auth.user!
    console.log('User ID:', user.id)
    // Lấy tổ chức hiện tại từ session
    const currentOrganizationId = session.get('current_organization_id')
    console.log('Current organization ID from session:', currentOrganizationId)
    // Nếu không có tổ chức hiện tại, kiểm tra xem người dùng có tổ chức nào không
    if (!currentOrganizationId) {
      // Lấy tổ chức đầu tiên của người dùng
      const userOrganization = await db
        .from('organization_users')
        .where('user_id', user.id)
        .join('organizations', 'organizations.id', '=', 'organization_users.organization_id')
        .whereNull('organizations.deleted_at')
        .select('organizations.id')
        .first()
      if (userOrganization) {
        // Cập nhật session với tổ chức đầu tiên
        session.put('current_organization_id', userOrganization.id)
        await session.commit()
        console.log('Set default organization:', userOrganization.id)
      }
      // Nếu người dùng không có tổ chức nào, vẫn cho phép tiếp tục
      return next()
    } else {
      // Kiểm tra tổ chức có tồn tại không
      const organization = await Organization.find(currentOrganizationId)
      if (!organization) {
        console.error('Organization not found:', currentOrganizationId)
        session.forget('current_organization_id')
        await session.commit()
      } else {
        // Kiểm tra người dùng có quyền truy cập tổ chức không
        const hasAccess = await db
          .from('organization_users')
          .where('organization_id', organization.id)
          .where('user_id', user.id)
          .first()
        if (!hasAccess) {
          console.error('User has no access to organization:', currentOrganizationId)
          session.forget('current_organization_id')
          await session.commit()
        }
      }
    }
    return next()
  }
}
