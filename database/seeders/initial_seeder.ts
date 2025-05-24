import { BaseSeeder } from '@adonisjs/lucid/seeders'
import UserRole from '#models/user_role'
import UserStatus from '#models/user_status'
import User from '#models/user'
import TaskStatus from '#models/task_status'
import TaskLabel from '#models/task_label'
import TaskPriority from '#models/task_priority'
import { OrganizationSeeder } from './organization_seeder.js'

export default class extends BaseSeeder {
  private async seedUserRoles() {
    await UserRole.createMany([
      {
        name: 'superadmin',
        description: 'Quản trị viên cao cấp với toàn quyền truy cập',
      },
      {
        name: 'admin',
        description: 'Quản trị viên với hầu hết các đặc quyền',
      },
      {
        name: 'user',
        description: 'Người dùng thông thường với quyền truy cập hạn chế',
      },
      {
        name: 'guest',
        description: 'Người dùng khách với quyền truy cập tối thiểu',
      },
    ])
  }

  private async seedUserStatus() {
    await UserStatus.createMany([
      {
        name: 'active',
        description: 'Người dùng đang hoạt động và có thể đăng nhập',
      },
      {
        name: 'inactive',
        description: 'Người dùng không hoạt động và không thể đăng nhập',
      },
      {
        name: 'suspended',
        description: 'Người dùng bị tạm ngưng tạm thời',
      },
    ])
  }

  private async seedUsers() {
    // Get roles
    const superadminRole = await UserRole.findBy('name', 'superadmin')
    const adminRole = await UserRole.findBy('name', 'admin')
    const userRole = await UserRole.findBy('name', 'user')
    const guestRole = await UserRole.findBy('name', 'guest')

    // Get statuses
    const activeStatus = await UserStatus.findBy('name', 'active')
    const inactiveStatus = await UserStatus.findBy('name', 'inactive')
    // const suspendedStatus = await UserStatus.findBy('name', 'suspended')

    if (superadminRole && adminRole && userRole && guestRole && activeStatus) {
      await User.createMany([
        {
          id: 1,
          first_name: 'Super',
          last_name: 'Admin',
          username: 'superadmin',
          email: 'superadmin@example.com',
          password: 'password_hash',
          role_id: superadminRole.id,
          status_id: activeStatus.id,
        },
        {
          id: 2,
          first_name: 'Admin',
          last_name: 'User',
          username: 'admin',
          email: 'admin@example.com',
          password: 'password_hash',
          role_id: adminRole.id,
          status_id: activeStatus.id,
        },
        {
          id: 3,
          first_name: 'John',
          last_name: 'Doe',
          username: 'johndoe',
          email: 'john@example.com',
          password: 'password_hash',
          role_id: userRole.id,
          status_id: activeStatus.id,
        },
        {
          id: 4,
          first_name: 'Jane',
          last_name: 'Smith',
          username: 'janesmith',
          email: 'jane@example.com',
          password: 'password_hash',
          role_id: userRole.id,
          status_id: activeStatus.id,
        },
        {
          id: 5,
          first_name: 'Guest',
          last_name: 'User',
          username: 'guest',
          email: 'guest@example.com',
          password: 'password_hash',
          role_id: guestRole.id,
          status_id: inactiveStatus?.id,
        },
      ])
    }
  }

  private async seedTaskStatus() {
    await TaskStatus.createMany([
      {
        name: 'todo',
        description: 'Nhiệm vụ chưa bắt đầu',
      },
      {
        name: 'in progress',
        description: 'Nhiệm vụ đang được thực hiện',
      },
      {
        name: 'done',
        description: 'Nhiệm vụ đã hoàn thành',
      },
      {
        name: 'cancelled',
        description: 'Nhiệm vụ bị hủy',
      },
      {
        name: 'in review',
        description: 'Nhiệm vụ đang được xem xét/kiểm tra',
      },
    ])
  }

  private async seedTaskLabels() {
    await TaskLabel.createMany([
      {
        name: 'bug',
        description: 'Nhiệm vụ liên quan đến sửa lỗi',
      },
      {
        name: 'feature',
        description: 'Nhiệm vụ thêm tính năng mới',
      },
      {
        name: 'enhancement',
        description: 'Nhiệm vụ cải thiện chức năng hiện có',
      },
      {
        name: 'documentation',
        description: 'Nhiệm vụ liên quan đến tài liệu',
      },
    ])
  }

  private async seedTaskPriorities() {
    await TaskPriority.createMany([
      {
        name: 'low',
        description: 'Nhiệm vụ ưu tiên thấp',
      },
      {
        name: 'medium',
        description: 'Nhiệm vụ ưu tiên trung bình',
      },
      {
        name: 'high',
        description: 'Nhiệm vụ ưu tiên cao',
      },
      {
        name: 'urgent',
        description: 'Nhiệm vụ khẩn cấp cần chú ý ngay lập tức',
      },
    ])
  }

  async run() {
    await this.seedUserRoles()
    await this.seedUserStatus()
    await this.seedUsers()
    await this.seedTaskStatus()
    await this.seedTaskLabels()
    await this.seedTaskPriorities()
    // Thêm organization seeder
    await new OrganizationSeeder(this.client).run()
  }
}
