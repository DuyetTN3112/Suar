import TaskStatus from '#models/task_status'
import TaskLabel from '#models/task_label'
import TaskPriority from '#models/task_priority'
import { inject } from '@adonisjs/core'
import { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'

@inject()
export default class GetTaskMetadata {
  constructor(protected ctx: HttpContext) {}

  async handle() {
    const statuses = await TaskStatus.all()
    const labels = await TaskLabel.all()
    const priorities = await TaskPriority.all()
    // Lấy tổ chức hiện tại từ session
    const currentOrganizationId = this.ctx.session.get('current_organization_id')
    if (!currentOrganizationId) {
      // Không ném ngoại lệ, thay vào đó đánh dấu session để hiển thị modal
      this.ctx.session.put('show_organization_required_modal', true)
      await this.ctx.session.commit()
      // Trả về metadata cơ bản với danh sách người dùng rỗng
      return {
        statuses,
        labels,
        priorities,
        users: [],
        message: 'Cần chọn hoặc tham gia một tổ chức để xem danh sách người dùng',
      }
    }
    // Lấy danh sách người dùng thuộc cùng tổ chức
    const usersInOrg = await db
      .from('users as u')
      .join('organization_users as ou', 'u.id', 'ou.user_id')
      .where('ou.organization_id', currentOrganizationId)
      .where('ou.status', 'approved')
      .whereNull('u.deleted_at')
      .select('u.id', 'u.first_name', 'u.last_name', 'u.full_name')
      .orderBy('u.full_name', 'asc')
    // Xử lý trường hợp full_name có thể bị null
    const formattedUsers = usersInOrg.map((user) => {
      return {
        id: user.id,
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        full_name: user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim(),
      }
    })
    return {
      statuses,
      labels,
      priorities,
      users: formattedUsers,
    }
  }
}
