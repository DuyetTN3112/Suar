import router from '@adonisjs/core/services/router'

import { middleware } from '../kernel.js'

import { throttle } from '#start/limiter'

// Task use-case controllers
const ListTasksController = () => import('#modules/tasks/controllers/list_tasks_controller')
const CreateTaskController = () => import('#modules/tasks/controllers/create_task_controller')
const ShowTaskStatusBoardController = () =>
  import('#modules/tasks/controllers/show_task_status_board_controller')
const ShowTaskController = () => import('#modules/tasks/controllers/show_task_controller')
const EditTaskController = () => import('#modules/tasks/controllers/edit_task_controller')
const DeleteTaskController = () => import('#modules/tasks/controllers/delete_task_controller')
const UpdateTaskStatusController = () =>
  import('#modules/tasks/controllers/update_task_status_controller')
const UpdateTaskTimeController = () =>
  import('#modules/tasks/controllers/update_task_time_controller')
const GetTaskAuditLogsController = () =>
  import('#modules/tasks/controllers/get_task_audit_logs_controller')

// Task Application use-case controllers
const ListTaskApplicationsController = () =>
  import('#modules/tasks/controllers/list_task_applications_controller')
const ApplyForTaskController = () => import('#modules/tasks/controllers/apply_for_task_controller')
const ProcessApplicationController = () =>
  import('#modules/tasks/controllers/process_application_controller')
const WithdrawApplicationController = () =>
  import('#modules/tasks/controllers/withdraw_application_controller')
const MyApplicationsController = () =>
  import('#modules/tasks/controllers/my_applications_controller')
const ListPublicTasksController = () =>
  import('#modules/tasks/controllers/list_public_tasks_controller')
const ListPublicTasksApiController = () =>
  import('#modules/tasks/controllers/list_public_tasks_api_controller')
const ApplyForTaskApiController = () =>
  import('#modules/tasks/controllers/apply_for_task_api_controller')
const CheckCreatePermissionController = () =>
  import('#modules/tasks/controllers/check_create_permission_controller')
const ListTasksGroupedController = () =>
  import('#modules/tasks/controllers/list_tasks_grouped_controller')
const ListTasksTimelineController = () =>
  import('#modules/tasks/controllers/list_tasks_timeline_controller')
const UpdateTaskSortOrderController = () =>
  import('#modules/tasks/controllers/update_task_sort_order_controller')
const BatchUpdateTaskStatusController = () =>
  import('#modules/tasks/controllers/batch_update_task_status_controller')
const PatchTaskStatusBoardPocController = () =>
  import('#modules/tasks/controllers/patch_task_status_board_poc_controller')

// Task Status + Workflow controllers (Phase 4)
const ListTaskStatusesController = () =>
  import('#modules/tasks/controllers/list_task_statuses_controller')
const CreateTaskStatusController = () =>
  import('#modules/tasks/controllers/create_task_status_controller')
const UpdateTaskStatusDefinitionController = () =>
  import('#modules/tasks/controllers/update_task_status_definition_controller')
const DeleteTaskStatusController = () =>
  import('#modules/tasks/controllers/delete_task_status_controller')
const ListWorkflowController = () => import('#modules/tasks/controllers/list_workflow_controller')
const UpdateWorkflowController = () =>
  import('#modules/tasks/controllers/update_workflow_controller')

router
  .group(() => {
    // Tasks routes — use-case controllers
    router.get('/tasks', [ListTasksController, 'handle']).as('tasks.index')

    // API routes for task management views
    router
      .get('/api/tasks/check-create-permission', [CheckCreatePermissionController, 'handle'])
      .as('api.tasks.check_create_permission')
    router.get('/api/tasks/grouped', [ListTasksGroupedController, 'handle']).as('api.tasks.grouped')
    router
      .get('/api/tasks/timeline', [ListTasksTimelineController, 'handle'])
      .as('api.tasks.timeline')
    router
      .patch('/api/tasks/batch-status', [BatchUpdateTaskStatusController, 'handle'])
      .as('api.tasks.batch_status')
    router
      .patch('/api/tasks/status-board', [PatchTaskStatusBoardPocController, 'handle'])
      .as('api.tasks.status_board')
    router
      .patch('/api/tasks/:id/sort-order', [UpdateTaskSortOrderController, 'handle'])
      .as('api.tasks.sort_order')

    router.get('/tasks/create', [CreateTaskController, 'showForm']).as('tasks.create')
    router
      .get('/tasks/status-board', [ShowTaskStatusBoardController, 'handle'])
      .as('tasks.status_board')
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
    router.get('/my-applications', [MyApplicationsController, 'handle']).as('applications.mine')

    // ── Task Status CRUD (Phase 4) ──────────────────────────────────────
    router
      .get('/api/task-statuses', [ListTaskStatusesController, 'handle'])
      .as('api.task_statuses.index')
    router
      .post('/api/task-statuses', [CreateTaskStatusController, 'handle'])
      .as('api.task_statuses.store')
    router
      .put('/api/task-statuses/:id', [UpdateTaskStatusDefinitionController, 'handle'])
      .as('api.task_statuses.update')
    router
      .delete('/api/task-statuses/:id', [DeleteTaskStatusController, 'handle'])
      .as('api.task_statuses.destroy')

    // ── Workflow Transitions (Phase 4) ──────────────────────────────────
    router.get('/api/workflow', [ListWorkflowController, 'handle']).as('api.workflow.index')
    router.put('/api/workflow', [UpdateWorkflowController, 'handle']).as('api.workflow.update')
  })
  .use([middleware.auth(), middleware.requireOrg(), throttle])

// Marketplace routes - public tasks for freelancers
router
  .group(() => {
    router.get('/marketplace/tasks', [ListPublicTasksController, 'handle']).as('marketplace.tasks')
    router
      .get('/api/marketplace/tasks', [ListPublicTasksApiController, 'handle'])
      .as('api.marketplace.tasks')
    router
      .post('/api/tasks/:taskId/apply', [ApplyForTaskApiController, 'handle'])
      .as('api.tasks.apply')
  })
  .use([middleware.auth()])
