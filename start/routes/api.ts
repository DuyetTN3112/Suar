import router from '@adonisjs/core/services/router'
import { middleware } from '../kernel.js'
import { apiThrottle } from '#start/limiter'
import env from '#start/env'

// Lazy-loaded controllers (AdonisJS convention for tree-shaking)
const ApiController = () => import('#controllers/http/api_controller')
const RedisController = () => import('#controllers/http/redis_controller')
const TasksController = () => import('#controllers/tasks/tasks_controller')

router
  .group(() => {
    // ─── Placeholder routes ───────────────────────────────────
    router.get('/search', ({ response }) => {
      response.json({ results: [] })
    })
    router.get('/modules/:id/posts', ({ response }) => {
      response.json({ posts: [] })
    })

    // ─── Task audit logs ──────────────────────────────────────
    router.get('/tasks/:id/audit-logs', [TasksController, 'getAuditLogs'])

    // ─── Redis management (admin-only) ────────────────────────
    router
      .group(() => {
        router.get('/keys', [RedisController, 'listKeys'])
        router.post('/cache', [RedisController, 'setCache'])
        router.get('/cache/:key', [RedisController, 'getCache'])
        router.delete('/cache/:key', [RedisController, 'clearCache'])
        router.delete('/cache', [RedisController, 'flushCache'])
      })
      .prefix('/redis')
      .use(middleware.authorizeRole(['superadmin', 'system_admin']))

    // ─── Organization & User APIs (Lucid Models) ──────────────
    router.get('/organization-members/:id', [ApiController, 'getOrganizationMembers'])
    router.get('/me', [ApiController, 'me'])
    router.get('/users-in-organization', [ApiController, 'getUsersInOrganization'])

    // ─── Conversation check ───────────────────────────────────
    router.post('/check-existing-conversation', [ApiController, 'checkExistingConversation'])

    // ─── Debug (DEV-only) ─────────────────────────────────────
    if (env.get('NODE_ENV') === 'development') {
      router.get('/debug-organization-info', [ApiController, 'debugOrganizationInfo'])
    }
  })
  .prefix('/api')
  .use([middleware.auth(), apiThrottle])
