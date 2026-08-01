import router from '@adonisjs/core/services/router'

import { middleware } from '../kernel.js'

import { resolveAuthLandingQuery } from '#composition/auth_application_composition'
import { shouldMountTestingRoutes } from '#modules/testing/public_contracts/test_database_safety'

// Import specialized route modules (NEW: admin, organizations current)
import './admin.js' // System Admin routes (/admin)
import './organizations_current.js' // Current organization admin routes (/org)

// Import các file routes
import './auth.js'
import './users.js'
import './tasks.js'
import './settings.js'
import './notifications.js'
import './api_v1.js'
import './api.js'
import './organizations.js'
import './projects.js'
import './reviews.js'
import './marketplace.js'
import './deprecated/api_v1_org_aliases.js'
import './deprecated/api_context_aliases.js'
import './deprecated/task_surface_aliases.js'
import './deprecated/api_org_compat_aliases.js'

// Health checks controller
const HealthChecksController = () => import('#modules/http/controllers/health_checks_controller')
const NotificationMetricsController = () =>
  import('#modules/notifications/controllers/notification_metrics_controller')
const SearchPageController = () => import('#modules/http/controllers/search_page_controller')

// Route test đơn giản
router.get('/test', async ({ inertia }) => {
  return inertia.render('index', {})
})

router.get('/search', [SearchPageController, 'handle']).as('search.index').use([middleware.auth()])

router
  .get('/dashboard', async ({ auth, inertia, response }) => {
    const user = auth.user
    if (!user) {
      return response.redirect('/login')
    }
    const landingPath = await resolveAuthLandingQuery.execute({
      id: user.id,
      systemRole: user.system_role,
      currentOrganizationId: user.current_organization_id,
    })

    if (landingPath !== '/dashboard') {
      return response.redirect(landingPath)
    }

    return inertia.render('index', {})
  })
  .as('dashboard.show')
  .use([middleware.auth()])

// Chrome DevTools probe on Linux desktop; return 204 to avoid noisy logs.
router.get('/.well-known/appspecific/com.chrome.devtools.json', ({ response }) => {
  response.noContent()
})

// Health check route
// FIX BẢO MẬT: Dùng ApiKeyMiddleware (timing-safe comparison, validate env)
// thay vì inline check dùng process.env (không validate, không timing-safe)
// Liveness intentionally exposes no dependency state. It must stay independent
// from Redis/readiness so orchestrators do not restart a healthy process during
// a cache outage or invalidation backlog.
router.get('/live', ({ response }) => response.noContent())

router.get('/health', [HealthChecksController]).use([middleware.opsApiKey()])
router
  .get('/metrics/cache', [HealthChecksController, 'cacheMetrics'])
  .use([middleware.metricsApiKey()])
router
  .get('/metrics/notifications', [NotificationMetricsController])
  .use([middleware.metricsApiKey()])

// Thêm routes cho dev tools
if (process.env['NODE_ENV'] === 'development') {
  const DevController = () => import('#modules/http/controllers/dev_controller')
  router.post('/api/dev/restart', [DevController, 'restart']).as('api.dev.restart.store')
}

// ─── Error routes + root redirect + catch-all (PHẢI import cuối cùng) ───
import './errors.js'
import './skills.js'

// Test-only routes must never mount on the normal development database.
if (shouldMountTestingRoutes()) {
  await import('./testing.js')
}
