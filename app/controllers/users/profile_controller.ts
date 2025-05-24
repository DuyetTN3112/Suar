import type { HttpContext } from '@adonisjs/core/http'
import User from '../../models/user.js'
import { updateProfile } from '../../actions/users/update_profile.js'
import UserSetting from '../../models/user_setting.js'

export default class ProfileController {
  /**
   * Hiển thị thông tin cá nhân người dùng đăng nhập
   */
  async show(ctx: HttpContext) {
    const { inertia, auth } = ctx
    const user = await User.query()
      .where('id', auth.user!.id)
      .preload('user_detail')
      .preload('user_profile')
      .preload('user_urls')
      .preload('user_setting')
      .firstOrFail()

    return inertia.render('users/profile', { user })
  }

  /**
   * Cập nhật thông tin cá nhân người dùng
   */
  async update(ctx: HttpContext) {
    const { request, response, auth, session } = ctx
    try {
      await updateProfile(auth.user!.id.toString(), request)
      session.flash('success', 'Thông tin cá nhân đã được cập nhật')
      return response.redirect().back()
    } catch (error) {
      session.flash('error', error.message || 'Có lỗi xảy ra khi cập nhật thông tin cá nhân')
      return response.redirect().back()
    }
  }

  /**
   * Cập nhật thiết lập người dùng
   */
  async updateSettings(ctx: HttpContext) {
    const { request, response, auth, session } = ctx
    try {
      const user = await User.findOrFail(auth.user!.id)
      // Tìm hoặc tạo settings
      let settings = await UserSetting.query().where('user_id', user.id).first()
      if (!settings) {
        settings = new UserSetting()
        settings.user_id = user.id
      }
      await settings
        .merge({
          theme: request.input('theme', 'light'),
          notifications_enabled: request.input('notifications_enabled', true),
          display_mode: request.input('display_mode', 'grid'),
        })
        .save()
      session.flash('success', 'Thiết lập đã được cập nhật')
      return response.redirect().back()
    } catch (error) {
      session.flash('error', error.message || 'Có lỗi xảy ra khi cập nhật thiết lập')
      return response.redirect().back()
    }
  }
}
