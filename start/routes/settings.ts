import router from '@adonisjs/core/services/router'
import { middleware } from '../kernel.js'

// Settings controllers
const SettingsController = () => import('#controllers/settings/settings_controller')

router
  .group(() => {
    // Settings routes
    router.get('/settings', [SettingsController, 'show']).as('settings.index')
    router.put('/settings', [SettingsController, 'update']).as('settings.update')

    // Profile settings
    router
      .get('/settings/profile', async ({ inertia }) => {
        return inertia.render('settings/profile')
      })
      .as('settings.profile')
    router
      .post('/settings/profile', [SettingsController, 'updateProfile'])
      .as('settings.profile.update')

    // Account settings
    router
      .get('/settings/account', async ({ inertia }) => {
        return inertia.render('settings/account')
      })
      .as('settings.account')
    router
      .post('/settings/account', [SettingsController, 'updateAccount'])
      .as('settings.account.update')

    // Appearance settings
    router
      .get('/settings/appearance', async ({ inertia }) => {
        return inertia.render('settings/appearance')
      })
      .as('settings.appearance')
    router
      .post('/settings/appearance', [SettingsController, 'updateAppearance'])
      .as('settings.appearance.update')
    // Display settings
    router
      .get('/settings/display', async ({ inertia }) => {
        return inertia.render('settings/display')
      })
      .as('settings.display')
    router
      .post('/settings/display', [SettingsController, 'updateDisplay'])
      .as('settings.display.update')
    // Notifications settings
    router
      .get('/settings/notifications', async ({ inertia }) => {
        return inertia.render('settings/notifications')
      })
      .as('settings.notifications')
    router
      .post('/settings/notifications', [SettingsController, 'updateNotifications'])
      .as('settings.notifications.update')

    // Existing account routes
    router
      .get('/account', async ({ inertia }) => {
        return inertia.render('settings/account')
      })
      .as('account.index')
    router
      .delete('/account', async ({ response }) => {
        // Xử lý xóa tài khoản
        return response.redirect('/login')
      })
      .as('account.destroy')
  })
  .use(middleware.auth())
