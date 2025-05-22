import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import GetUserSettings from '#actions/settings/get_user_settings'
import UpdateUserSettings from '#actions/settings/update_user_settings'

export default class SettingsController {
  @inject()
  async show({ inertia }: HttpContext, getUserSettings: GetUserSettings) {
    const settings = await getUserSettings.handle()
    return inertia.render('settings/index', { settings })
  }

  @inject()
  async update(
    { request, response, session }: HttpContext,
    updateUserSettings: UpdateUserSettings
  ) {
    const data = request.only(['theme', 'notifications_enabled', 'display_mode'])
    await updateUserSettings.handle({ data })
    session.flash('success', 'Cài đặt đã được cập nhật thành công')
    return response.redirect().back()
  }

  @inject()
  async updateProfile({ request, response, auth, session }: HttpContext) {
    try {
      const user = auth.user!
      const data = request.only(['first_name', 'last_name', 'phone_number', 'address'])
      await user.merge(data).save()
      session.flash('success', 'Thông tin hồ sơ đã được cập nhật thành công')
      return response.redirect().back()
    } catch (error) {
      session.flash('error', error.message || 'Có lỗi xảy ra khi cập nhật hồ sơ')
      return response.redirect().back()
    }
  }

  @inject()
  async updateAccount({ request, response, auth, session }: HttpContext) {
    try {
      const user = auth.user!
      const data = request.only(['email', 'current_password', 'password', 'password_confirmation'])
      // Thực hiện xác thực password hiện tại và cập nhật mật khẩu/email
      // Đây chỉ là code mẫu, bạn cần thêm xác thực mật khẩu
      if (data.password && data.password !== data.password_confirmation) {
        session.flash('error', 'Mật khẩu xác nhận không khớp')
        return response.redirect().back()
      }
      await user
        .merge({
          email: data.email || user.email,
        })
        .save()
      if (data.password) {
        // Cập nhật mật khẩu, cần thêm hash password ở đây
        // await user.merge({ password: hashPassword(data.password) }).save()
      }
      session.flash('success', 'Thông tin tài khoản đã được cập nhật thành công')
      return response.redirect().back()
    } catch (error) {
      session.flash('error', error.message || 'Có lỗi xảy ra khi cập nhật tài khoản')
      return response.redirect().back()
    }
  }

  @inject()
  async updateAppearance(
    { request, response, auth, session }: HttpContext,
    updateUserSettings: UpdateUserSettings
  ) {
    try {
      const data = request.only(['theme', 'font'])
      await updateUserSettings.handle({ data })
      session.flash('success', 'Giao diện đã được cập nhật thành công')
      return response.redirect().back()
    } catch (error) {
      session.flash('error', error.message || 'Có lỗi xảy ra khi cập nhật giao diện')
      return response.redirect().back()
    }
  }

  @inject()
  async updateDisplay(
    { request, response, auth, session }: HttpContext,
    updateUserSettings: UpdateUserSettings
  ) {
    try {
      const data = request.only(['layout', 'density', 'animations_enabled', 'custom_scrollbars'])
      await updateUserSettings.handle({ data })
      session.flash('success', 'Tùy chọn hiển thị đã được cập nhật thành công')
      return response.redirect().back()
    } catch (error) {
      session.flash('error', error.message || 'Có lỗi xảy ra khi cập nhật tùy chọn hiển thị')
      return response.redirect().back()
    }
  }

  @inject()
  async updateNotifications(
    { request, response, session }: HttpContext,
    updateUserSettings: UpdateUserSettings
  ) {
    try {
      const data = {
        notifications_enabled: request.input('emailNotifications', false),
        push_notifications: request.input('pushNotifications', false),
      }
      await updateUserSettings.handle({
        data: {
          notifications_enabled: data.notifications_enabled,
        },
      })
      session.flash('success', 'Cài đặt thông báo đã được cập nhật thành công')
      return response.redirect().back()
    } catch (error) {
      session.flash('error', error.message || 'Có lỗi xảy ra khi cập nhật cài đặt thông báo')
      return response.redirect().back()
    }
  }
}
