import { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import db from '@adonisjs/lucid/services/db'
import Project from '#models/project'

type ProjectData = {
  name: string
  description?: string
  organization_id: number
  status_id?: number
  start_date?: string
  end_date?: string
  manager_id?: number
}

@inject()
export default class CreateProject {
  constructor(protected ctx: HttpContext) {}

  async handle({ data }: { data: ProjectData }) {
    const user = this.ctx.auth.user!
    try {
      // Kiểm tra dữ liệu đầu vào
      if (!data.name) {
        throw new Error('Tên dự án là bắt buộc')
      }

      if (!data.organization_id) {
        throw new Error('ID tổ chức là bắt buộc')
      }

      // Sử dụng stored procedure create_project
      await db.rawQuery('CALL create_project(?, ?, ?, ?, ?, ?, ?, ?)', [
        user.id, // creator_id
        data.organization_id,
        data.name,
        data.description || null,
        data.status_id || 1, // Mặc định là 'pending'
        data.start_date || null,
        data.end_date || null,
        data.manager_id || user.id, // Mặc định manager là người tạo
      ])

      // Lấy dự án vừa tạo (dự án mới nhất của người dùng)
      const project = await Project.query()
        .where('creator_id', user.id)
        .orderBy('created_at', 'desc')
        .first()

      if (!project) {
        throw new Error('Không thể tạo dự án')
      }

      return project
    } catch (error) {
      console.error('Lỗi khi tạo dự án:', error)
      throw error
    }
  }
}
