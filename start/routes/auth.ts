import router from '@adonisjs/core/services/router'
import { middleware } from '../kernel.js'

// Auth controllers
const LoginController = () => import('#controllers/auth/login_controller')
const RegisterController = () => import('#controllers/auth/register_controller')
const LogoutController = () => import('#controllers/auth/logout_controller')
const ForgotPasswordController = () => import('#controllers/auth/forgot_password_controller')
const ResetPasswordController = () => import('#controllers/auth/reset_password_controller')

// Authentication routes
router.get('/login', [LoginController, 'show']).use(middleware.guest())
router.post('/login', [LoginController, 'store'])
router.get('/register', [RegisterController, 'show']).use(middleware.guest())
router.post('/register', [RegisterController, 'store']).use(middleware.guest())
router.post('/logout', [LogoutController, 'handle']).use(middleware.auth())
router.get('/logout', [LogoutController, 'handle']).use(middleware.auth())
router.get('/forgot-password', [ForgotPasswordController, 'show']).use(middleware.guest())
router.post('/forgot-password', [ForgotPasswordController, 'store']).use(middleware.guest())
router.get('/reset-password/:token', [ResetPasswordController, 'show']).use(middleware.guest())
router.post('/reset-password', [ResetPasswordController, 'store']).use(middleware.guest())
