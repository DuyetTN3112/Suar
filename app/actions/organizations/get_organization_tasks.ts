import { inject } from '@adonisjs/core'
import { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'

interface GetOrganizationTasksOptions {
  organization_id?: number | string
}

@inject()
export default class GetOrganizationTasks {
  constructor(protected ctx: HttpContext) {}

  async handle(options: GetOrganizationTasksOptions = {}) {
    try {
      const user = this.ctx.auth.user!
      // Lấy tổ chức hiện tại từ session hoặc từ tham số
      const organizationId =
        options.organization_id || this.ctx.session.get('current_organization_id')
      if (!organizationId) {
        throw new Error('Không tìm thấy ID tổ chức')
      }

      // Sử dụng stored procedure để lấy danh sách task của tổ chức
      const result = await db.rawQuery('CALL get_organization_tasks(?, ?)', [
        user.id,
        organizationId,
      ])

      // Kết quả từ stored procedure MySQL thường nằm ở phần tử đầu tiên của mảng
      if (result && Array.isArray(result) && result[0]) {
        return {
          success: true,
          tasks: result[0],
        }
      }
      return {
        success: true,
        tasks: [],
      }
    } catch (error: any) {
      console.error('Lỗi khi lấy danh sách task của tổ chức:', error)
      return {
        success: false,
        message: error.message || 'Chỉ admin mới có thể xem tất cả task trong tổ chức',
        tasks: [],
      }
    }
  }
}
