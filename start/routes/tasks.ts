import router from '@adonisjs/core/services/router'

import { middleware } from '../kernel.js'

import { throttle } from '#start/limiter'

// Task use-case controllers
const ListTasksController = () => import('#modules/tasks/controllers/list_tasks_controller')
const CreateTaskController = () => import('#modules/tasks/controllers/create_task_controller')
const ShowTaskStatusBoardController = () =>
  import('#modules/tasks/controllers/show_task_status_board_controller')
const ShowTaskController = () => import('#modules/tasks/controllers/show_task_controller')
const ShowTaskApiController = () => import('#modules/tasks/controllers/show_task_api_controller')
const EditTaskController = () => import('#modules/tasks/controllers/edit_task_controller')
const DeleteTaskController = () => import('#modules/tasks/controllers/delete_task_controller')
const UpdateTaskStatusController = () =>
  import('#modules/tasks/controllers/update_task_status_controller')
const UpdateTaskTimeController = () =>
  import('#modules/tasks/controllers/update_task_time_controller')
const GetTaskAuditLogsController = () =>
  import('#modules/tasks/controllers/get_task_audit_logs_controller')
const TaskSubmissionController = () =>
  import('#modules/tasks/controllers/task_submission_controller')
const MatchScoresController = () =>
  import('#modules/tasks/controllers/match_scores_controller')

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
    router.get('/api/tasks/:id', [ShowTaskApiController, 'handle']).as('api.tasks.show')
    router
      .get('/api/tasks/:id/submission', [TaskSubmissionController, 'show'])
      .as('api.tasks.submission.show')
    router
      .post('/api/tasks/:id/submission', [TaskSubmissionController, 'saveDraft'])
      .as('api.tasks.submission.store')
    router
      .patch('/api/tasks/:id/submission', [TaskSubmissionController, 'saveDraft'])
      .as('api.tasks.submission.update')
    router
      .post('/api/tasks/:id/submission/submit', [TaskSubmissionController, 'submit'])
      .as('api.tasks.submission.submit')
    router
      .post('/api/tasks/:id/submission/lock', [TaskSubmissionController, 'lock'])
      .as('api.tasks.submission.lock')
    router
      .get('/api/task-submissions/:submissionId/evidences', [
        TaskSubmissionController,
        'listEvidences',
      ])
      .as('api.task_submissions.evidences.index')
    router
      .post('/api/task-submissions/:submissionId/evidences', [
        TaskSubmissionController,
        'addEvidence',
      ])
      .as('api.task_submissions.evidences.store')
    router
      .delete('/api/task-submissions/:submissionId/evidences/:evidenceId', [
        TaskSubmissionController,
        'deleteEvidence',
      ])
      .as('api.task_submissions.evidences.destroy')
    router
      .get('/api/tasks/:taskId/comments', [TaskSubmissionController, 'listComments'])
      .as('api.tasks.comments.index')
    router
      .post('/api/tasks/:taskId/comments', [TaskSubmissionController, 'createComment'])
      .as('api.tasks.comments.store')
    router
      .patch('/api/tasks/:taskId/comments/:commentId', [
        TaskSubmissionController,
        'updateComment',
      ])
      .as('api.tasks.comments.update')
    router
      .delete('/api/tasks/:taskId/comments/:commentId', [
        TaskSubmissionController,
        'deleteComment',
      ])
      .as('api.tasks.comments.destroy')
    router
      .get('/api/tasks/:taskId/attachments', [TaskSubmissionController, 'listAttachments'])
      .as('api.tasks.attachments.index')
    router
      .post('/api/tasks/:taskId/attachments', [TaskSubmissionController, 'createAttachment'])
      .as('api.tasks.attachments.store')
    router
      .delete('/api/tasks/:taskId/attachments/:attachmentId', [
        TaskSubmissionController,
        'deleteAttachment',
      ])
      .as('api.tasks.attachments.destroy')

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

    router
      .get('/api/tasks/:taskId/applications/:applicationId/match', [MatchScoresController, 'show'])
      .as('api.tasks.applications.match')
    router
      .get('/api/tasks/:taskId/applications/ranking', [MatchScoresController, 'ranking'])
      .as('api.tasks.applications.ranking')

    // Application processing
    router
      .post('/applications/:id/process', [ProcessApplicationController, 'handle'])
      .as('applications.process')
    router
      .post('/applications/:id/withdraw', [WithdrawApplicationController, 'handle'])
      .as('applications.withdraw')

    // My applications - for freelancers
    router.get('/my-applications', [MyApplicationsController, 'handle']).as('applications.mine')

    // ── Task Status list — any org member ────────────────────────────────
    router
      .get('/api/task-statuses', [ListTaskStatusesController, 'handle'])
      .as('api.task_statuses.index')

    // ── Workflow read — any org member ──────────────────────────────────
    router.get('/api/workflow', [ListWorkflowController, 'handle']).as('api.workflow.index')
  })
  .use([middleware.auth(), middleware.requireOrg(), throttle])

// ── Task Status mutation + Workflow mutation — admin/owner only ──────
router
  .group(() => {
    router.post('/task-statuses', [CreateTaskStatusController, 'handle']).as('api.task_statuses.store')
    router
      .put('/task-statuses/:id', [UpdateTaskStatusDefinitionController, 'handle'])
      .as('api.task_statuses.update')
    router
      .delete('/task-statuses/:id', [DeleteTaskStatusController, 'handle'])
      .as('api.task_statuses.destroy')

    router.put('/workflow', [UpdateWorkflowController, 'handle']).as('api.workflow.update')
  })
  .prefix('/api')
  .use([middleware.auth(), middleware.requireOrg(), middleware.requireOrgAdmin(), throttle])

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
