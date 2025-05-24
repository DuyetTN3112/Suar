import User from '#models/user'
import UserDetail from '#models/user_detail'
import UserProfile from '#models/user_profile'
import UserSetting from '#models/user_setting'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'

type RegisterData = {
  firstName: string
  lastName: string
  username: string
  email: string
  password: string
}

@inject()
export default class Register {
  constructor(protected ctx: HttpContext) {}

  async handle({ data }: { data: RegisterData }) {
    try {
      return await db.transaction(async (trx) => {
        // Tìm status_id và role_id mặc định
        const defaultStatusId = await db
          .from('user_status')
          .where('name', 'active')
          .select('id')
          .first()
        const defaultRoleId = await db.from('user_roles').where('name', 'user').select('id').first()

        if (!defaultStatusId || !defaultRoleId) {
          throw new Error('Default status or role not found. Database may not be properly set up.')
        }

        // Tạo user mới
        const user = await User.create(
          {
            first_name: data.firstName,
            last_name: data.lastName,
            username: data.username,
            email: data.email,
            password: data.password,
            status_id: defaultStatusId.id,
            role_id: defaultRoleId.id,
            current_organization_id: null,
          },
          { client: trx }
        )

        try {
          // Tạo profile và thông tin chi tiết
          await UserDetail.create(
            {
              user_id: user.id,
            },
            { client: trx }
          )

          await UserProfile.create(
            {
              user_id: user.id,
              language: 'vi',
            },
            { client: trx }
          )

          // Tạo cài đặt người dùng mặc định
          await UserSetting.create(
            {
              user_id: user.id,
              theme: 'light',
              notifications_enabled: true,
              display_mode: 'grid',
            },
            { client: trx }
          )
        } catch (error) {
          throw error
        }
        // Đăng nhập người dùng mới tạo
        await this.ctx.auth.use('web').login(user)
        return user
      })
    } catch (error) {
      throw error
    }
  }
}
