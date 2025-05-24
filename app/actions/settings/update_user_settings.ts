import { HttpContext } from '@adonisjs/core/http'
import UserSetting from '#models/user_setting'
import AuditLog from '#models/audit_log'

type SettingsData = {
  theme?: 'light' | 'dark' | 'system'
  notifications_enabled?: boolean
  display_mode?: 'grid' | 'list'
  font?: string
  layout?: string
  density?: string
  animations_enabled?: boolean
  custom_scrollbars?: boolean
}

export default class UpdateUserSettings {
  constructor(protected ctx: HttpContext) {}

  async handle({ data }: { data: SettingsData }) {
    const user = this.ctx.auth.user!
    // Tìm hoặc tạo setting
    let setting = await UserSetting.findBy('user_id', user.id)
    const oldData = setting ? setting.toJSON() : null
    if (!setting) {
      setting = await UserSetting.create({
        user_id: user.id,
        theme: data.theme || 'light',
        notifications_enabled:
          data.notifications_enabled !== undefined ? data.notifications_enabled : true,
        display_mode: data.display_mode || 'grid',
        font: data.font || 'inter',
        layout: data.layout || 'default',
        density: data.density || 'default',
        animations_enabled: data.animations_enabled !== undefined ? data.animations_enabled : true,
        custom_scrollbars: data.custom_scrollbars !== undefined ? data.custom_scrollbars : true,
      })
    } else {
      // Cập nhật setting
      if (data.theme !== undefined) setting.theme = data.theme
      if (data.notifications_enabled !== undefined)
        setting.notifications_enabled = data.notifications_enabled
      if (data.display_mode !== undefined) setting.display_mode = data.display_mode
      if (data.font !== undefined) setting.font = data.font
      if (data.layout !== undefined) setting.layout = data.layout
      if (data.density !== undefined) setting.density = data.density
      if (data.animations_enabled !== undefined)
        setting.animations_enabled = data.animations_enabled
      if (data.custom_scrollbars !== undefined) setting.custom_scrollbars = data.custom_scrollbars
      await setting.save()
    }
    // Ghi log hành động
    await AuditLog.create({
      user_id: user.id,
      action: 'update',
      entity_type: 'user_setting',
      entity_id: Number(setting.id),
      old_values: oldData,
      new_values: setting.toJSON(),
      ip_address: this.ctx.request.ip(),
      user_agent: this.ctx.request.header('user-agent'),
    })

    return setting
  }
}
