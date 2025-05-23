import { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import db from '@adonisjs/lucid/services/db'
import Project from '#models/project'

@inject()
export default class DeleteProject {
  constructor(protected ctx: HttpContext) {}

  async handle(projectId: number) {
    const user = this.ctx.auth.user!
    try {
      // Kiểm tra dự án tồn tại và người dùng có quyền xóa
      const project = await Project.query().where('id', projectId).whereNull('deleted_at').first()

      if (!project) {
        throw new Error('Dự án không tồn tại hoặc đã bị xóa')
      }

      // Kiểm tra quyền xóa (chỉ owner hoặc superadmin mới có quyền xóa)
      const isOwner = project.owner_id === user.id
      const isSuperAdmin = await this.checkIsSuperAdmin(user.id, project.organization_id)

      if (!isOwner && !isSuperAdmin) {
        throw new Error('Bạn không có quyền xóa dự án này')
      }

      // Sử dụng stored procedure delete_project
      await db.rawQuery('CALL delete_project(?, ?)', [projectId, user.id])

      return { success: true, message: 'Dự án đã được xóa thành công' }
    } catch (error) {
      console.error('Lỗi khi xóa dự án:', error)
      throw error
    }
  }

  // Kiểm tra người dùng có phải là superadmin của tổ chức không
  private async checkIsSuperAdmin(userId: number, organizationId: number): Promise<boolean> {
    const result = await db.rawQuery(
      `SELECT COUNT(*) as count 
       FROM organization_users 
       WHERE user_id = ? 
         AND organization_id = ? 
         AND role_id = 1 
         AND status = 'approved'`,
      [userId, organizationId]
    )

    return result[0][0]?.count > 0
  }
}
