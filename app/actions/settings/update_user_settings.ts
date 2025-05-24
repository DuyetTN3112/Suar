import { HttpContext } from '@adonisjs/core/http'

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

/**
 * Update user settings
 * Note: Settings are now stored client-side (localStorage/cookies)
 * This is a no-op for backwards compatibility
 */
export default class UpdateUserSettings {
  constructor(protected ctx: HttpContext) {}

  async handle({ data }: { data: SettingsData }) {
    // Settings are managed client-side
    // This method exists for backwards compatibility but does nothing
    // Frontend will handle persistence via localStorage/cookies
    return {
      success: true,
      message: 'Settings updated (client-side)',
      data,
    }
  }
}
