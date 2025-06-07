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
import './errors.js'
import './reviews.js'

// Health checks controller
const HealthChecksController = () => import('#controllers/health_checks_controller')

// Route test đơn giản
router.get('/test', async ({ inertia }) => {
  return inertia.render('index')
})

// Health check route
router.get('/health', [HealthChecksController]).use(async (ctx, next) => {
  // Kiểm tra API key từ header hoặc từ query parameter
  const apiKey: string | undefined =
    ctx.request.header('x-api-key') ?? (ctx.request.qs() as Record<string, string | undefined>).key
  const expectedApiKey = process.env.HEALTH_CHECK_API_KEY

  if (apiKey !== expectedApiKey) {
    ctx.response.unauthorized({ message: 'API key không hợp lệ' })
    return
  }
  await next()
})

// Thêm routes cho dev tools
if (process.env.NODE_ENV === 'development') {
  router.post('/api/dev/restart', '#controllers/http/dev_controller.restart')
}
