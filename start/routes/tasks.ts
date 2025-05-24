import router from '@adonisjs/core/services/router'
import { middleware } from '../kernel.js'

// Task controller
const TasksController = () => import('#controllers/tasks/tasks_controller')

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
    // API route to check task creation permission (optional)
    // Note: Implement handler in controller if needed
    // router.get('/api/tasks/check-create-permission', [TasksController, 'checkCreatePermission']).as('api.tasks.check_permission')
  })
  .use([middleware.auth(), middleware.requireOrg()])
