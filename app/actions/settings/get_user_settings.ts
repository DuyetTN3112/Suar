import { HttpContext } from '@adonisjs/core/http'

/**
 * Get user settings
 * Note: Settings are now stored client-side (localStorage/cookies)
 * This returns default values for server-side rendering
 */
export default class GetUserSettings {
  constructor(protected ctx: HttpContext) {}

  async handle() {
    // Return default settings for SSR
    // Actual settings are managed client-side
    return {
      theme: 'light',
      notifications_enabled: true,
      display_mode: 'grid',
    }
  }
}
