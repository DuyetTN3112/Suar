import { inject } from '@adonisjs/core'
import { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'

interface GetUserTasksOptions {
  user_id?: number | string
  status?: string
}

@inject()
export default class GetUserTasks {
  constructor(protected ctx: HttpContext) {}

  async handle(options: GetUserTasksOptions = {}) {
    try {
      // Nếu không chỉ định user_id, lấy từ người dùng hiện tại
      const userId = options.user_id || this.ctx.auth.user?.id
      if (!userId) {
        throw new Error('Không tìm thấy ID người dùng')
      }

      // Sử dụng stored procedure để lấy danh sách task của người dùng
      const result = await db.rawQuery('CALL get_user_tasks(?, ?)', [
        userId,
        options.status || null,
      ])
      // Kết quả từ stored procedure MySQL thường nằm ở phần tử đầu tiên của mảng
      if (result && Array.isArray(result) && result[0]) {
        return result[0]
      }
      return []
    } catch (error) {
      console.error('Lỗi khi lấy danh sách task của người dùng:', error)
      return []
    }
  }
}
