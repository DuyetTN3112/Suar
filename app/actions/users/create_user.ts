import User from '#models/user'
import UserDetail from '#models/user_detail'
import UserProfile from '#models/user_profile'
import UserSetting from '#models/user_setting'
import { inject } from '@adonisjs/core'
import { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import AuditLog from '#models/audit_log'
import hash from '@adonisjs/core/services/hash'
import { DateTime } from 'luxon'

type UserData = {
  first_name: string
  last_name: string
  username: string
  email: string
  password: string
  role_id: number
  status_id: number
  phone_number?: string
  bio?: string
  date_of_birth?: string
  language?: string
}

@inject()
export default class CreateUser {
  constructor(protected ctx: HttpContext) {}

  async handle({ data }: { data: UserData }) {
    const user = this.ctx.auth.user!
    return await db.transaction(async (trx) => {
      // Tạo user mới
      const plainPassword = data.password
      const newUser = await User.create(
        {
          first_name: data.first_name,
          last_name: data.last_name,
          username: data.username,
          email: data.email,
          password: plainPassword,
          role_id: data.role_id,
          status_id: data.status_id,
        },
        { client: trx }
      )

      // Tạo profile và thông tin chi tiết
      await UserDetail.create(
        {
          user_id: newUser.id,
          phone_number: data.phone_number,
          bio: data.bio,
        },
        { client: trx }
      )

      await UserProfile.create(
        {
          user_id: newUser.id,
          language: data.language || 'vi',
          date_of_birth: data.date_of_birth ? DateTime.fromISO(data.date_of_birth) : null,
        },
        { client: trx }
      )

      // Tạo cài đặt người dùng mặc định
      await UserSetting.create(
        {
          user_id: newUser.id,
          theme: 'light',
          notifications_enabled: true,
          display_mode: 'grid',
        },
        { client: trx }
      )

      // Ghi log hành động
      await AuditLog.create(
        {
          user_id: user.id,
          action: 'create',
          entity_type: 'user',
          entity_id: newUser.id,
          new_values: {
            ...newUser.toJSON(),
            password: '[redacted]',
          },
          ip_address: this.ctx.request.ip(),
          user_agent: this.ctx.request.header('user-agent'),
        },
        { client: trx }
      )

      return newUser
    })
  }
}
