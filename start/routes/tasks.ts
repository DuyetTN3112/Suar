import router from '@adonisjs/core/services/router'
import { middleware } from '../kernel.js'

// Task controllers
const TasksController = () => import('#controllers/tasks/tasks_controller')
const TaskApplicationsController = () => import('#controllers/tasks/task_applications_controller')

router
  .group(() => {
    // Root route - chuyển hướng đến trang tasks
    router.get('/', [TasksController, 'index'])
    // Tasks routes
    router.get('/tasks', [TasksController, 'index']).as('tasks.index')
    router.get('/tasks/create', [TasksController, 'create']).as('tasks.create')
    router.post('/tasks', [TasksController, 'store']).as('tasks.store')
    router.get('/tasks/:id', [TasksController, 'show']).as('tasks.show')
    router.get('/tasks/:id/edit', [TasksController, 'edit']).as('tasks.edit')
    router.put('/tasks/:id', [TasksController, 'update']).as('tasks.update')
    router.put('/tasks/:id/status', [TasksController, 'updateStatus']).as('tasks.update.status')
    router.patch('/tasks/:id/time', [TasksController, 'updateTime']).as('tasks.update.time')
    router.delete('/tasks/:id', [TasksController, 'destroy']).as('tasks.destroy')
    // Audit logs routes for tasks
    router.get('/tasks/:id/audit-logs', [TasksController, 'getAuditLogs']).as('tasks.audit_logs')

    // Task Applications - for project owners
    router
      .get('/tasks/:taskId/applications', [TaskApplicationsController, 'taskApplications'])
      .as('tasks.applications')
    router
      .post('/tasks/:taskId/apply', [TaskApplicationsController, 'apply'])
      .as('tasks.apply')

    // Application processing
    router
      .post('/applications/:id/process', [TaskApplicationsController, 'processApplication'])
      .as('applications.process')
    router
      .post('/applications/:id/withdraw', [TaskApplicationsController, 'withdrawApplication'])
      .as('applications.withdraw')

    // My applications - for freelancers
    router
      .get('/my-applications', [TaskApplicationsController, 'myApplications'])
      .as('applications.mine')
  })
  .use([middleware.auth(), middleware.requireOrg()])

// Marketplace routes - public tasks for freelancers
router
  .group(() => {
    router.get('/marketplace/tasks', [TaskApplicationsController, 'publicTasks']).as('marketplace.tasks')
    router
      .get('/api/marketplace/tasks', [TaskApplicationsController, 'publicTasksApi'])
      .as('api.marketplace.tasks')
    router
      .post('/api/tasks/:taskId/apply', [TaskApplicationsController, 'applyApi'])
      .as('api.tasks.apply')
  })
  .use([middleware.auth()])
