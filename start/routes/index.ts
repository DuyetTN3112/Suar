import router from '@adonisjs/core/services/router'

// Import các file routes
import './auth.js'
import './users.js'
import './tasks.js'
import './settings.js'
import './notifications.js'
import './conversations.js'
import './api.js'
import './organizations.js'
import './projects.js'
import './reviews.js'

// Health checks controller
const HealthChecksController = () => import('#controllers/health_checks_controller')

// Route test đơn giản
router.get('/test', async ({ inertia }) => {
  return inertia.render('index')
})

// Health check route
// FIX BẢO MẬT: Dùng ApiKeyMiddleware (timing-safe comparison, validate env)
// thay vì inline check dùng process.env (không validate, không timing-safe)
const ApiKeyMiddleware = () => import('#middleware/api_key_middleware')
router.get('/health', [HealthChecksController]).use(async (ctx, next) => {
  const { default: Middleware } = await ApiKeyMiddleware()
  const instance = new Middleware()
  await instance.handle(ctx, next)
})

// Thêm routes cho dev tools
if (process.env.NODE_ENV === 'development') {
  router.post('/api/dev/restart', '#controllers/http/dev_controller.restart')
}

// ─── Error routes + root redirect + catch-all (PHẢI import cuối cùng) ───
import './errors.js'
