import router from '@adonisjs/core/services/router'
import { middleware } from '../kernel.js'
import { throttle } from '#start/limiter'

// Task use-case controllers
const ListTasksController = () => import('#controllers/tasks/list_tasks_controller')
const CreateTaskController = () => import('#controllers/tasks/create_task_controller')
const ShowTaskController = () => import('#controllers/tasks/show_task_controller')
const EditTaskController = () => import('#controllers/tasks/edit_task_controller')
const DeleteTaskController = () => import('#controllers/tasks/delete_task_controller')
const UpdateTaskStatusController = () => import('#controllers/tasks/update_task_status_controller')
const UpdateTaskTimeController = () => import('#controllers/tasks/update_task_time_controller')
const GetTaskAuditLogsController = () => import('#controllers/tasks/get_task_audit_logs_controller')

// Task Application use-case controllers
const ListTaskApplicationsController = () =>
  import('#controllers/tasks/list_task_applications_controller')
const ApplyForTaskController = () => import('#controllers/tasks/apply_for_task_controller')
const ProcessApplicationController = () =>
  import('#controllers/tasks/process_application_controller')
const WithdrawApplicationController = () =>
  import('#controllers/tasks/withdraw_application_controller')
const MyApplicationsController = () => import('#controllers/tasks/my_applications_controller')
const ListPublicTasksController = () => import('#controllers/tasks/list_public_tasks_controller')
const ListPublicTasksApiController = () =>
  import('#controllers/tasks/list_public_tasks_api_controller')
const ApplyForTaskApiController = () =>
  import('#controllers/tasks/apply_for_task_api_controller')

router
  .group(() => {
    // Tasks routes — use-case controllers
    router.get('/tasks', [ListTasksController, 'handle']).as('tasks.index')
    router.get('/tasks/create', [CreateTaskController, 'showForm']).as('tasks.create')
    router.post('/tasks', [CreateTaskController, 'handle']).as('tasks.store')
    router.get('/tasks/:id', [ShowTaskController, 'handle']).as('tasks.show')
    router.get('/tasks/:id/edit', [EditTaskController, 'showForm']).as('tasks.edit')
    router.put('/tasks/:id', [EditTaskController, 'handle']).as('tasks.update')
    router
      .put('/tasks/:id/status', [UpdateTaskStatusController, 'handle'])
      .as('tasks.update.status')
    router.patch('/tasks/:id/time', [UpdateTaskTimeController, 'handle']).as('tasks.update.time')
    router.delete('/tasks/:id', [DeleteTaskController, 'handle']).as('tasks.destroy')
    // Audit logs routes for tasks
    router
      .get('/tasks/:id/audit-logs', [GetTaskAuditLogsController, 'handle'])
      .as('tasks.audit_logs')

    // Task Applications - for project owners
    router
      .get('/tasks/:taskId/applications', [ListTaskApplicationsController, 'handle'])
      .as('tasks.applications')
    router.post('/tasks/:taskId/apply', [ApplyForTaskController, 'handle']).as('tasks.apply')

    // Application processing
    router
      .post('/applications/:id/process', [ProcessApplicationController, 'handle'])
      .as('applications.process')
    router
      .post('/applications/:id/withdraw', [WithdrawApplicationController, 'handle'])
      .as('applications.withdraw')

    // My applications - for freelancers
    router
      .get('/my-applications', [MyApplicationsController, 'handle'])
      .as('applications.mine')
  })
  .use([middleware.auth(), middleware.requireOrg(), throttle])

// Marketplace routes - public tasks for freelancers
router
  .group(() => {
    router
      .get('/marketplace/tasks', [ListPublicTasksController, 'handle'])
      .as('marketplace.tasks')
    router
      .get('/api/marketplace/tasks', [ListPublicTasksApiController, 'handle'])
      .as('api.marketplace.tasks')
    router
      .post('/api/tasks/:taskId/apply', [ApplyForTaskApiController, 'handle'])
      .as('api.tasks.apply')
  })
  .use([middleware.auth()])
