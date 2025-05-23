import { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import db from '@adonisjs/lucid/services/db'

type AddMemberData = {
  project_id: number
  user_id: number
}

@inject()
export default class AddProjectMember {
  constructor(protected ctx: HttpContext) {}

  async handle({ data }: { data: AddMemberData }) {
    const user = this.ctx.auth.user!
    try {
      // Kiểm tra dữ liệu đầu vào
      if (!data.project_id) {
        throw new Error('ID dự án là bắt buộc')
      }

      if (!data.user_id) {
        throw new Error('ID người dùng là bắt buộc')
      }

      // Sử dụng stored procedure add_project_member
      // Stored procedure này sẽ kiểm tra:
      // 1. Người thêm có phải là superadmin của tổ chức không
      // 2. Người được thêm có thuộc tổ chức không
      await db.rawQuery('CALL add_project_member(?, ?, ?)', [
        data.project_id,
        data.user_id,
        user.id,
      ])

      return {
        success: true,
        message: 'Đã thêm thành viên vào dự án thành công',
        project_id: data.project_id,
        user_id: data.user_id,
      }
    } catch (error) {
      console.error('Lỗi khi thêm thành viên vào dự án:', error)
      // Xử lý các lỗi từ stored procedure
      if (
        error.message.includes('Chỉ superadmin của tổ chức mới có thể thêm thành viên vào project')
      ) {
        throw new Error('Bạn không có quyền thêm thành viên vào dự án này')
      }
      if (error.message.includes('Người dùng không thuộc tổ chức của project')) {
        throw new Error('Người dùng không thuộc tổ chức của dự án')
      }
      throw error
    }
  }
}
