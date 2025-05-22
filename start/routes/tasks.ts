import router from '@adonisjs/core/services/router'
import { middleware } from '../kernel.js'

// Task controllers
const TaskController = () => import('#controllers/tasks/task_controller')
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
    router.patch('/tasks/:id/time', [TasksController, 'updateTime']).as('tasks.update.time')
    router.delete('/tasks/:id', [TasksController, 'destroy']).as('tasks.destroy')
    // Audit logs routes for tasks
    router.get('/tasks/:id/audit-logs', [TasksController, 'getAuditLogs']).as('tasks.audit_logs')
    
    // API route to check task creation permission
    router.get('/api/tasks/check-create-permission', [TasksController, 'checkCreatePermission']).as('api.tasks.check_permission')

    // Legacy task routes
    router.get('/task', [TaskController, 'index']).as('task.index')
    router.get('/task/create', [TaskController, 'create']).as('task.create')
    router.post('/task', [TaskController, 'store']).as('task.store')
    router.get('/task/:id', [TaskController, 'show']).as('task.show')
    router.get('/task/:id/edit', [TaskController, 'edit']).as('task.edit')
    router.put('/task/:id', [TaskController, 'update']).as('task.update')
    router.delete('/task/:id', [TaskController, 'destroy']).as('task.destroy')
  })
  .use(middleware.auth())
