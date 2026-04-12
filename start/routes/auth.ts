import router from '@adonisjs/core/services/router'

import { middleware } from '../kernel.js'

import { loginThrottle } from '#start/limiter'

// Auth controllers - Only OAuth and Logout
const LogoutController = () => import('#controllers/auth/logout_controller')
const SocialAuthController = () => import('#controllers/auth/social_auth_controller')

// Social authentication routes (OAuth only)
// FIX BẢO MẬT: Apply loginThrottle — chống brute-force OAuth redirect
router.get('/auth/:provider/redirect', [SocialAuthController, 'redirect']).use(loginThrottle)
router.get('/auth/:provider/callback', [SocialAuthController, 'callback']).use(loginThrottle)

// Logout routes
router.post('/logout', [LogoutController, 'handle']).as('logout').use(middleware.auth())
router.get('/logout', [LogoutController, 'handle']).as('logout.show').use(middleware.auth())

// Redirect /login to OAuth page (for backward compatibility)
router
  .get('/login', ({ inertia }) => {
    return inertia.render('auth/login', {})
  })
  .use(loginThrottle)
