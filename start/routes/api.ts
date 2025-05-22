import router from '@adonisjs/core/services/router'
import { middleware } from '../kernel.js'

// Redis controllers
const RedisController = () => import('#controllers/http/redis_controller')
const RedisTestController = () => import('#controllers/http/redis_test_controller')
// Task controller
const TasksController = () => import('#controllers/tasks/tasks_controller')

router
  .group(() => {
    // API routes cho search và module
    router.get('/search', async ({ response }) => {
      // Tìm kiếm
      return response.json({ results: [] })
    })

    router.get('/modules/:id/posts', async ({ response }) => {
      // Lấy bài viết của module
      return response.json({ posts: [] })
    })

    // API route cho audit logs
    router.get('/tasks/:id/audit-logs', [TasksController, 'getAuditLogs'])

    // API routes cho Redis và cache
    router
      .group(() => {
        // Redis test route
        router.get('/test', [RedisTestController, 'testConnection'])
        // Redis management routes
        router.get('/keys', [RedisController, 'listKeys'])
        router.post('/cache', [RedisController, 'setCache'])
        router.get('/cache/:key', [RedisController, 'getCache'])
        router.delete('/cache/:key', [RedisController, 'clearCache'])
        router.delete('/cache', [RedisController, 'flushCache'])
      })
      .prefix('/redis')

    // Thông tin người dùng
    router.get('/me', async ({ auth }) => {
      await auth.check()
      return auth.user
    })
  })
  .prefix('/api')
  .use(middleware.auth())
