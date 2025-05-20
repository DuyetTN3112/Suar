import router from '@adonisjs/core/services/router'
import { middleware } from '../kernel.js'

// Auth controllers - Only OAuth and Logout
const LogoutController = () => import('#controllers/auth/logout_controller')
const SocialAuthController = () => import('#controllers/auth/social_auth_controller')

// Social authentication routes (OAuth only)
router.get('/auth/:provider/redirect', [SocialAuthController, 'redirect'])
router.get('/auth/:provider/callback', [SocialAuthController, 'callback'])

// Logout routes
router.post('/logout', [LogoutController, 'handle']).use(middleware.auth())
router.get('/logout', [LogoutController, 'handle']).use(middleware.auth())

// Redirect /login to OAuth page (for backward compatibility)
router.get('/login', ({ inertia }) => {
  return inertia.render('auth/login')
})
