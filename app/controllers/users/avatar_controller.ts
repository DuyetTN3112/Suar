import { inject } from '@adonisjs/core'
import { HttpContext } from '@adonisjs/core/http'
import { cuid } from '@adonisjs/core/helpers'
import app from '@adonisjs/core/services/app'
import UserDetail from '#models/user_detail'

@inject()
export default class AvatarController {
  /**
   * Upload avatar cho người dùng
   */
  async update({ request, response, auth, session }: HttpContext) {
    try {
      // Lấy file avatar từ request
      const avatar = request.file('avatar', {
        size: '2mb',
        extnames: ['jpg', 'png', 'jpeg'],
      })

      // Kiểm tra xem có lỗi không
      if (!avatar || !avatar.isValid) {
        return response.badRequest({
          errors: avatar?.errors || ['Không tìm thấy file hoặc file không hợp lệ'],
        })
      }

      // Tạo tên file mới để đảm bảo tính duy nhất
      const fileName = `${cuid()}.${avatar.extname}`

      // Di chuyển file vào thư mục public/avatars
      await avatar.move(app.makePath('public/avatars'), {
        name: fileName,
      })

      // Cập nhật avatar_url trong user_detail cho người dùng hiện tại
      const user = auth.user!

      // Tìm user_detail hoặc tạo mới nếu chưa có
      let userDetail = await UserDetail.find(user.id)
      if (!userDetail) {
        userDetail = new UserDetail()
        userDetail.user_id = user.id
      }

      // Cập nhật đường dẫn avatar
      userDetail.avatar_url = `/avatars/${fileName}`
      await userDetail.save()

      session.flash('success', 'Avatar đã được cập nhật thành công')
      return response.redirect().back()
    } catch (error) {
      session.flash('error', error.message || 'Có lỗi xảy ra khi upload avatar')
      return response.redirect().back()
    }
  }
}
