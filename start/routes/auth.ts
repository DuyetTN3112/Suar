import router from '@adonisjs/core/services/router'

import { middleware } from '../kernel.js'

import { shouldMountTestingRoutes } from '#modules/testing/public_contracts/test_database_safety'
import { apiThrottle, loginThrottle } from '#start/limiter'

const LogoutController = () => import('#modules/auth/controllers/session-management/logout_controller')
const SessionTokenController = () => import('#modules/auth/controllers/session-management/session_token_controller')
const SocialAuthController = () => import('#modules/auth/controllers/social-auth/social_auth_controller')

router.get('/auth/:provider/redirect', [SocialAuthController, 'redirect']).use(loginThrottle)
router.get('/auth/:provider/callback', [SocialAuthController, 'callback']).use(loginThrottle)

router.post('/logout', [LogoutController, 'handle']).as('logout').use(middleware.auth())
router.get('/logout', [LogoutController, 'handle']).as('logout.show').use(middleware.auth())

router
  .post('/api/auth/token', [SessionTokenController, 'issue'])
  .use([
    middleware.bindHttpTransport('api-compat'),
    middleware.bindApiAuthContract('session-only'),
    middleware.auth(),
    apiThrottle,
  ])
router
  .post('/api/auth/refresh', [SessionTokenController, 'refresh'])
  .use([middleware.bindHttpTransport('api-compat'), apiThrottle])
router
  .post('/api/v1/auth/token', [SessionTokenController, 'issue'])
  .as('api.v1.auth.tokens.store')
  .use([
    middleware.bindHttpTransport('api-canonical'),
    middleware.bindApiAuthContract('session-only'),
    middleware.auth(),
    apiThrottle,
  ])
router
  .post('/api/v1/auth/refresh', [SessionTokenController, 'refresh'])
  .as('api.v1.auth.tokens.refresh.store')
  .use([middleware.bindHttpTransport('api-canonical'), apiThrottle])

router
  .get('/login', ({ inertia }) => inertia.render('auth/login', {}))
  .as('auth.login')
  .use(loginThrottle)

if (shouldMountTestingRoutes()) {
  const { testingAuthHandlers } = await import('#composition/auth/testing/testing_auth_composition')
  const testingTransport = [
    middleware.bindHttpTransport('api-ops-internal'),
    middleware.testingRoutesApiKey(),
  ]

  router.post('/api/testing/login', testingAuthHandlers.login).use(testingTransport)
  router.post('/api/testing/token-login', testingAuthHandlers.tokenLogin).use(testingTransport)
  router.post('/api/testing/token-refresh', testingAuthHandlers.tokenRefresh).use(testingTransport)
  router
    .post('/api/testing/session/bootstrap', testingAuthHandlers.bootstrapSession)
    .use(testingTransport)
}
