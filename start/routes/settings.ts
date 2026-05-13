import router from '@adonisjs/core/services/router'

import { middleware } from '../kernel.js'

import { throttle } from '#start/limiter'

const ShowSettingsController = () => import('#modules/settings/controllers/show_settings_controller')
const UpdateSettingsController = () => import('#modules/settings/controllers/update_settings_controller')
const UpdateProfileSettingsController = () =>
  import('#modules/settings/controllers/update_profile_settings_controller')
const UpdateAccountSettingsController = () =>
  import('#modules/settings/controllers/update_account_settings_controller')
const UpdateAppearanceSettingsController = () =>
  import('#modules/settings/controllers/update_appearance_settings_controller')
const UpdateDisplaySettingsController = () =>
  import('#modules/settings/controllers/update_display_settings_controller')
const UpdateNotificationSettingsController = () =>
  import('#modules/settings/controllers/update_notification_settings_controller')

router
  .group(() => {
    // Settings routes
    router.get('/settings', [ShowSettingsController, 'handle']).as('settings.index')
    router.put('/settings', [UpdateSettingsController, 'handle']).as('settings.update')

    // Profile settings
    router
      .get('/settings/profile', async ({ inertia }) => {
        return inertia.render('settings/profile', {})
      })
      .as('settings.profile')
    router
      .post('/settings/profile', [UpdateProfileSettingsController, 'handle'])
      .as('settings.profile.update')

    // Account settings
    router
      .get('/settings/account', async ({ inertia }) => {
        return inertia.render('settings/account', {})
      })
      .as('settings.account')
    router
      .post('/settings/account', [UpdateAccountSettingsController, 'handle'])
      .as('settings.account.update')

    // Appearance settings
    router
      .get('/settings/appearance', async ({ inertia }) => {
        return inertia.render('settings/appearance', {})
      })
      .as('settings.appearance')
    router
      .post('/settings/appearance', [UpdateAppearanceSettingsController, 'handle'])
      .as('settings.appearance.update')
    // Display settings
    router
      .get('/settings/display', async ({ inertia }) => {
        return inertia.render('settings/display', {})
      })
      .as('settings.display')
    router
      .post('/settings/display', [UpdateDisplaySettingsController, 'handle'])
      .as('settings.display.update')
    // Notifications settings
    router
      .get('/settings/notifications', async ({ inertia }) => {
        return inertia.render('settings/notifications', {})
      })
      .as('settings.notifications')
    router
      .post('/settings/notifications', [UpdateNotificationSettingsController, 'handle'])
      .as('settings.notifications.update')

    // Existing account routes
    router
      .get('/account', async ({ inertia }) => {
        return inertia.render('settings/account', {})
      })
      .as('account.index')
    router
      .delete('/account', ({ response }) => {
        // Xử lý xóa tài khoản
        response.redirect('/login')
      })
      .as('account.destroy')
  })
  .use([middleware.auth(), throttle])
