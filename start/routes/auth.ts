import router from '@adonisjs/core/services/router'
import { middleware } from '../kernel.js'

// Auth controllers
const LoginController = () => import('#controllers/auth/login_controller')
const RegisterController = () => import('#controllers/auth/register_controller')
const LogoutController = () => import('#controllers/auth/logout_controller')
const ForgotPasswordController = () => import('#controllers/auth/forgot_password_controller')
const SocialAuthController = () => import('#controllers/auth/social_auth_controller')

// Social authentication routes
router.get('/auth/:provider/redirect', [SocialAuthController, 'redirect'])
router.get('/auth/:provider/callback', [SocialAuthController, 'callback'])

// Authentication routes
router.get('/login', [LoginController, 'show']).use(middleware.guest())
router.post('/login', [LoginController, 'store'])
router.get('/register', [RegisterController, 'show']).use(middleware.guest())
router.post('/register', [RegisterController, 'store']).use(middleware.guest())
router.post('/logout', [LogoutController, 'handle']).use(middleware.auth())
router.get('/logout', [LogoutController, 'handle']).use(middleware.auth())

// Forgot password routes
router
  .group(() => {
    router.get('/', [ForgotPasswordController, 'index']).as('index')
    router.post('/', [ForgotPasswordController, 'send']).as('send')
    router.get('/reset/:value', [ForgotPasswordController, 'reset']).as('reset')
    router.post('/reset', [ForgotPasswordController, 'update']).as('update')
  })
  .prefix('/forgot-password')
  .as('forgot_password')
  .use(middleware.guest())
