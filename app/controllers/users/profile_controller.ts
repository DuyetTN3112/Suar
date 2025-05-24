import type { HttpContext } from '@adonisjs/core/http'
import User from '../../models/user.js'

export default class ProfileController {
  /**
   * Hiển thị thông tin cá nhân người dùng đăng nhập
   */
  async show(ctx: HttpContext) {
    const { inertia, auth } = ctx
    const user = await User.query().where('id', auth.user!.id).firstOrFail()

    return inertia.render('users/profile', { user })
  }

  /**
   * Cập nhật thông tin cá nhân người dùng (username/email)
   */
  async update(ctx: HttpContext) {
    const { request, response, auth, session } = ctx
    try {
      const user = await User.findOrFail(auth.user!.id)

      // Chỉ cho phép cập nhật username (email thường không nên đổi tùy tiện)
      const username = request.input('username')

      if (username && username !== user.username) {
        // Kiểm tra username đã tồn tại chưa
        const existingUser = await User.query()
          .where('username', username)
          .whereNot('id', user.id)
          .first()

        if (existingUser) {
          session.flash('error', 'Tên người dùng đã được sử dụng')
          return response.redirect().back()
        }

        user.username = username
        await user.save()
      }

      session.flash('success', 'Thông tin cá nhân đã được cập nhật')
      return response.redirect().back()
    } catch (error) {
      session.flash('error', error.message || 'Có lỗi xảy ra khi cập nhật thông tin cá nhân')
      return response.redirect().back()
    }
  }

  /**
   * Cập nhật thiết lập người dùng - DEPRECATED
   * Settings đã được chuyển sang settings controller
   */
  async updateSettings(ctx: HttpContext) {
    const { response, session } = ctx
    session.flash('info', 'Chức năng này đã được di chuyển sang trang cài đặt')
    return response.redirect().toRoute('settings.index')
  }
}
