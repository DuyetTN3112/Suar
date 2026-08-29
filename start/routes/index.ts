import router from '@adonisjs/core/services/router'

import { middleware } from '../kernel.js'

import { shouldMountTestingRoutes } from '#modules/testing/public_contracts/test_database_safety'
import { apiThrottle } from '#start/limiter'

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
const HealthChecksController = () => import('#modules/http/controllers/runtime/health_checks_controller')
const NotificationMetricsController = () =>
  import('#modules/notifications/controllers/notification-observability/notification_metrics_controller')
const SearchPageController = () =>
  import('#modules/http/controllers/search-discovery/search_page_controller')
const SearchDiscoveryApiController = () =>
  import('#modules/http/controllers/search-discovery/search_discovery_api_controller')
const AuthLandingController = () => import('#modules/auth/controllers/session-management/auth_landing_controller')
const OperationalProbeController = () =>
  import('#modules/http/controllers/runtime/operational_probe_controller')

router
  .get('/search', [SearchPageController, 'handle'])
  .as('search.index')
  .use([middleware.bindHttpTransport('page'), middleware.auth()])

// Search Discovery V2 is a read-only canonical endpoint. It intentionally has
// no mandatory auth middleware: the task public context supports anonymous
// browsing, while the global organization resolver still supplies a session
// user when one exists.
router
  .post('/api/v1/search/discovery', [SearchDiscoveryApiController, 'handle'])
  .as('api.v1.search.discovery')
  .use([middleware.bindHttpTransport('api-canonical'), apiThrottle])

router
  .get('/dashboard', [AuthLandingController, 'dashboard'])
  .as('dashboard.show')
  .use([middleware.bindHttpTransport('page'), middleware.auth()])

// Chrome DevTools probe on Linux desktop; return 204 to avoid noisy logs.
router
  .get('/.well-known/appspecific/com.chrome.devtools.json', [
    OperationalProbeController,
    'chromeDevtools',
  ])
  .use([middleware.bindHttpTransport('page')])

// Health check route
// FIX BẢO MẬT: Dùng ApiKeyMiddleware (timing-safe comparison, validate env)
// thay vì inline check dùng process.env (không validate, không timing-safe)
// Liveness intentionally exposes no dependency state. It must stay independent
// from Redis/readiness so orchestrators do not restart a healthy process during
// a cache outage or invalidation backlog.
router
  .get('/live', [OperationalProbeController, 'liveness'])
  .use([middleware.bindHttpTransport('api-ops-internal')])

router
  .get('/health', [HealthChecksController])
  .use([middleware.bindHttpTransport('api-ops-internal'), middleware.opsApiKey()])
router
  .get('/metrics/cache', [HealthChecksController, 'cacheMetrics'])
  .use([middleware.bindHttpTransport('api-ops-internal'), middleware.metricsApiKey()])
router
  .get('/metrics/notifications', [NotificationMetricsController])
  .use([middleware.bindHttpTransport('api-ops-internal'), middleware.metricsApiKey()])

// Thêm routes cho dev tools
if (process.env['NODE_ENV'] === 'development') {
  const DevController = () => import('#modules/http/controllers/runtime/dev_controller')
  router
    .post('/api/dev/restart', [DevController, 'restart'])
    .as('api.dev.restart.store')
    .use([middleware.bindHttpTransport('api-ops-internal')])
}

// ─── Error routes + root redirect + catch-all (PHẢI import cuối cùng) ───
import './errors.js'
import './skills.js'

// Test-only routes must never mount on the normal development database.
if (shouldMountTestingRoutes()) {
  await import('./testing.js')
}
