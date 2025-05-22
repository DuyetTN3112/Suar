import User from '#models/user'
import UserDetail from '#models/user_detail'
import UserProfile from '#models/user_profile'
import { inject } from '@adonisjs/core'
import { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import AuditLog from '#models/audit_log'
import { DateTime } from 'luxon'

type UserData = {
  first_name?: string
  last_name?: string
  username?: string
  email?: string
  password?: string
  role_id?: number
  status_id?: number
  phone_number?: string
  bio?: string
  date_of_birth?: string
  language?: string
}

@inject()
export default class UpdateUser {
  constructor(protected ctx: HttpContext) {}

  async handle({ id, data }: { id: number; data: UserData }) {
    const user = this.ctx.auth.user!

    try {
      // Tìm user cần cập nhật để lấy thông tin cũ
      const userToUpdate = await User.findOrFail(id)
      const oldData = {
        ...userToUpdate.toJSON(),
        password: '[redacted]',
      }

      // Chuẩn bị dữ liệu để cập nhật user thông qua stored procedure
      const userData = {
        first_name: data.first_name || userToUpdate.first_name,
        last_name: data.last_name || userToUpdate.last_name,
      }

      // Sử dụng stored procedure để cập nhật thông tin cơ bản
      await db.rawQuery('CALL edit_user_with_permission(?, ?, ?)', [
        user.id,
        id,
        JSON.stringify(userData),
      ])

      // Cập nhật các thông tin bổ sung không có trong stored procedure
      if (data.password || data.username || data.email || data.role_id || data.status_id) {
        const updateData: Record<string, string | number> = {}
        if (data.password) updateData['password'] = data.password
        if (data.username) updateData['username'] = data.username
        if (data.email) updateData['email'] = data.email
        if (data.role_id) updateData['role_id'] = data.role_id
        if (data.status_id) updateData['status_id'] = data.status_id
        await userToUpdate.merge(updateData).save()
      }

      // Cập nhật thông tin chi tiết
      if (data.phone_number !== undefined || data.bio !== undefined) {
        let userDetail = await UserDetail.findBy('user_id', id)
        if (userDetail) {
          if (data.phone_number !== undefined) userDetail.phone_number = data.phone_number
          if (data.bio !== undefined) userDetail.bio = data.bio
          await userDetail.save()
        }
      }

      // Cập nhật profile
      if (data.language || data.date_of_birth) {
        let userProfile = await UserProfile.findBy('user_id', id)
        if (userProfile) {
          if (data.language) userProfile.language = data.language
          if (data.date_of_birth) userProfile.date_of_birth = DateTime.fromISO(data.date_of_birth)
          await userProfile.save()
        }
      }

      // Lấy thông tin đã cập nhật
      const updatedUser = await User.findOrFail(id)
      // Ghi log hành động
      await AuditLog.create({
        user_id: Number(user.id),
        action: 'update',
        entity_type: 'user',
        entity_id: id,
        old_values: oldData,
        new_values: {
          ...updatedUser.toJSON(),
          password: '[redacted]',
        },
        ip_address: this.ctx.request.ip(),
        user_agent: this.ctx.request.header('user-agent') || '',
      })

      return updatedUser
    } catch (error) {
      console.error('Error updating user:', error)
      throw new Error(error.message || 'Có lỗi khi cập nhật người dùng')
    }
  }
}
