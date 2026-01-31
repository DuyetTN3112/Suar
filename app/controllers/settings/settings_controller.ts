import type { HttpContext } from '@adonisjs/core/http'
import GetUserSettings from '#actions/settings/get_user_settings'
import UpdateUserSettings from '#actions/settings/update_user_settings'

export default class SettingsController {
  async show(ctx: HttpContext) {
    const { inertia } = ctx

    // Manual instantiation
    const getUserSettings = new GetUserSettings(ctx)

    const settings = getUserSettings.handle()
    return inertia.render('settings/index', { settings })
  }

  update(ctx: HttpContext) {
    const { request, response, session } = ctx

    // Manual instantiation
    const updateUserSettings = new UpdateUserSettings(ctx)

    const data = request.only(['theme', 'notifications_enabled', 'display_mode']) as {
      theme?: string
      notifications_enabled?: boolean
      display_mode?: string
    }

    // Validate theme
    if (data.theme && !['light', 'dark', 'system'].includes(data.theme)) {
      data.theme = 'light' // default fallback
    }

    updateUserSettings.handle({
      data: {
        theme: data.theme as 'light' | 'dark' | 'system' | undefined,
        notifications_enabled: data.notifications_enabled,
        display_mode: data.display_mode as 'grid' | 'list' | undefined,
      },
    })
    session.flash('success', 'Cài đặt đã được cập nhật thành công')
    response.redirect().back()
  }

  async updateProfile(ctx: HttpContext) {
    const { request, response, auth, session } = ctx

    try {
      const user = auth.user
      if (!user) {
        throw new Error('User not authenticated')
      }
      const data = request.only(['username', 'email']) as { username?: string; email?: string }
      await user.merge(data).save()
      session.flash('success', 'Thông tin hồ sơ đã được cập nhật thành công')
      response.redirect().back()
      return
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Có lỗi xảy ra khi cập nhật hồ sơ'
      session.flash('error', errorMessage)
      response.redirect().back()
      return
    }
  }

  async updateAccount(ctx: HttpContext) {
    const { request, response, auth, session } = ctx

    try {
      const user = auth.user
      if (!user) {
        throw new Error('User not authenticated')
      }
      const data = request.only(['email']) as { email?: string }

      await user
        .merge({
          email: data.email || user.email,
        })
        .save()

      session.flash('success', 'Thông tin tài khoản đã được cập nhật thành công')
      response.redirect().back()
      return
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Có lỗi xảy ra khi cập nhật tài khoản'
      session.flash('error', errorMessage)
      response.redirect().back()
      return
    }
  }

  updateAppearance(ctx: HttpContext) {
    const { request, response, session } = ctx

    // Manual instantiation
    const updateUserSettings = new UpdateUserSettings(ctx)

    try {
      const data = request.only(['theme', 'font']) as { theme?: string; font?: string }

      // Validate theme
      if (data.theme && !['light', 'dark', 'system'].includes(data.theme)) {
        data.theme = 'light' // default fallback
      }

      updateUserSettings.handle({
        data: {
          theme: data.theme as 'light' | 'dark' | 'system' | undefined,
          font: data.font,
        },
      })
      session.flash('success', 'Giao diện đã được cập nhật thành công')
      response.redirect().back()
      return
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Có lỗi xảy ra khi cập nhật giao diện'
      session.flash('error', errorMessage)
      response.redirect().back()
      return
    }
  }

  updateDisplay(ctx: HttpContext) {
    const { request, response, session } = ctx

    // Manual instantiation
    const updateUserSettings = new UpdateUserSettings(ctx)

    try {
      const data = request.only([
        'layout',
        'density',
        'animations_enabled',
        'custom_scrollbars',
      ]) as {
        layout?: string
        density?: string
        animations_enabled?: boolean
        custom_scrollbars?: boolean
      }
      updateUserSettings.handle({ data })
      session.flash('success', 'Tùy chọn hiển thị đã được cập nhật thành công')
      response.redirect().back()
      return
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Có lỗi xảy ra khi cập nhật tùy chọn hiển thị'
      session.flash('error', errorMessage)
      response.redirect().back()
      return
    }
  }

  updateNotifications(ctx: HttpContext) {
    const { request, response, session } = ctx

    // Manual instantiation
    const updateUserSettings = new UpdateUserSettings(ctx)

    try {
      const emailNotifications = request.input('emailNotifications', false) as boolean
      const pushNotifications = request.input('pushNotifications', false) as boolean
      const data = {
        notifications_enabled: emailNotifications,
        push_notifications: pushNotifications,
      }
      updateUserSettings.handle({
        data: {
          notifications_enabled: data.notifications_enabled,
        },
      })
      session.flash('success', 'Cài đặt thông báo đã được cập nhật thành công')
      response.redirect().back()
      return
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Có lỗi xảy ra khi cập nhật cài đặt thông báo'
      session.flash('error', errorMessage)
      response.redirect().back()
      return
    }
  }
}
