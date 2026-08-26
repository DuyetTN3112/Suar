import router from '@adonisjs/core/services/router'

import { middleware } from '../kernel.js'

import { throttle } from '#start/limiter'

// Task use-case controllers
const ListTasksController = () => import('#modules/tasks/controllers/list_tasks_controller')
const ListMyWorkController = () => import('#modules/tasks/controllers/list_my_work_controller')
const CreateTaskController = () => import('#modules/tasks/controllers/create_task_controller')
const ShowTaskController = () => import('#modules/tasks/controllers/show_task_controller')
const ShowTaskApiController = () => import('#modules/tasks/controllers/show_task_api_controller')
const EditTaskController = () => import('#modules/tasks/controllers/edit_task_controller')
const DeleteTaskController = () => import('#modules/tasks/controllers/delete_task_controller')
const UpdateTaskStatusController = () =>
  import('#modules/tasks/controllers/update_task_status_controller')
const UpdateTaskTimeController = () =>
  import('#modules/tasks/controllers/update_task_time_controller')
const GetTaskAuditLogsController = () =>
  import('#modules/tasks/controllers/task-reading/get_task_audit_logs_controller')
const TaskSubmissionController = () =>
  import('#modules/tasks/controllers/task_submission_controller')
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
const ReplaceTaskWorkflowTransitionsController = () =>
  import('#modules/tasks/controllers/replace_task_workflow_transitions_controller')

router
  .group(() => {
    router.get('/work', [ListMyWorkController, 'handle']).as('work.index')
    router
      .get('/work/tasks/:taskId', [ShowTaskController, 'handle'])
      .where('taskId', router.matchers.uuid())
      .as('work.tasks.show')

    router
      .group(() => {
        router
          .put('/tasks/:taskId/status', [UpdateTaskStatusController, 'handle'])
          .as('work.api.tasks.status.update')
        router
          .get('/tasks/:taskId/submission', [TaskSubmissionController, 'show'])
          .as('work.api.tasks.submission.show')
        router
          .post('/tasks/:taskId/submission', [TaskSubmissionController, 'saveDraft'])
          .as('work.api.tasks.submission.store')
        router
          .patch('/tasks/:taskId/submission', [TaskSubmissionController, 'saveDraft'])
          .as('work.api.tasks.submission.update')
        router
          .post('/tasks/:taskId/submission/submit', [TaskSubmissionController, 'submit'])
          .as('work.api.tasks.submission.submit')
        router
          .post('/tasks/:taskId/submission/lock', [TaskSubmissionController, 'lock'])
          .as('work.api.tasks.submission.lock')
        router
          .get('/tasks/submissions/:submissionId/evidences', [
            TaskSubmissionController,
            'listEvidences',
          ])
          .as('work.api.task_submissions.evidences.index')
        router
          .post('/tasks/submissions/:submissionId/evidences', [
            TaskSubmissionController,
            'addEvidence',
          ])
          .as('work.api.task_submissions.evidences.store')
        router
          .delete('/tasks/submissions/:submissionId/evidences/:evidenceId', [
            TaskSubmissionController,
            'deleteEvidence',
          ])
          .as('work.api.task_submissions.evidences.destroy')
        router
          .get('/tasks/:taskId/comments', [TaskSubmissionController, 'listComments'])
          .as('work.api.tasks.comments.index')
        router
          .post('/tasks/:taskId/comments', [TaskSubmissionController, 'createComment'])
          .as('work.api.tasks.comments.store')
        router
          .patch('/tasks/:taskId/comments/:commentId', [
            TaskSubmissionController,
            'updateComment',
          ])
          .as('work.api.tasks.comments.update')
        router
          .delete('/tasks/:taskId/comments/:commentId', [
            TaskSubmissionController,
            'deleteComment',
          ])
          .as('work.api.tasks.comments.destroy')
        router
          .get('/tasks/:taskId/attachments', [TaskSubmissionController, 'listAttachments'])
          .as('work.api.tasks.attachments.index')
        router
          .post('/tasks/:taskId/attachments', [TaskSubmissionController, 'createAttachment'])
          .as('work.api.tasks.attachments.store')
        router
          .delete('/tasks/:taskId/attachments/:attachmentId', [
            TaskSubmissionController,
            'deleteAttachment',
          ])
          .as('work.api.tasks.attachments.destroy')
      })
      .prefix('/work/api')
      .use([
        middleware.bindHttpTransport('api-compat'),
        middleware.bindApiAuthContract('session-or-bearer'),
      ])
  })
  .use([middleware.auth(), throttle])

router
  .group(() => {
    // Tasks routes — use-case controllers
    router.get('/tasks', [ListTasksController, 'handle']).as('tasks.index')

    // API routes for task management views
    router
      .group(() => {
        router
          .get('/api/tasks/creation-access', [CheckCreatePermissionController, 'handle'])
          .as('api.tasks.creation_access.show')
        router
          .get('/api/tasks/status-groups', [ListTasksGroupedController, 'handle'])
          .as('api.tasks.status_groups.index')
        router
          .get('/api/tasks/timeline-items', [ListTasksTimelineController, 'handle'])
          .as('api.tasks.timeline_items.index')
        router
          .patch('/api/tasks/batch-status', [BatchUpdateTaskStatusController, 'handle'])
          .as('api.tasks.statuses.batch.update')
        router
          .patch('/api/tasks/:taskId/sort-order', [UpdateTaskSortOrderController, 'handle'])
          .as('api.tasks.sort_order.update')
        router
          .get('/api/tasks/:taskId', [ShowTaskApiController, 'handle'])
          .where('taskId', router.matchers.uuid())
          .as('api.tasks.show')
        router
          .get('/api/tasks/:taskId/submission', [TaskSubmissionController, 'show'])
          .as('api.tasks.submission.show')
        router
          .post('/api/tasks/:taskId/submission', [TaskSubmissionController, 'saveDraft'])
          .as('api.tasks.submission.store')
        router
          .patch('/api/tasks/:taskId/submission', [TaskSubmissionController, 'saveDraft'])
          .as('api.tasks.submission.update')
        router
          .post('/api/tasks/:taskId/submission/submit', [TaskSubmissionController, 'submit'])
          .as('api.tasks.submission.submit')
        router
          .post('/api/tasks/:taskId/submission/lock', [TaskSubmissionController, 'lock'])
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
      })
      .use([
        middleware.bindHttpTransport('api-compat'),
        middleware.bindApiAuthContract('session-or-bearer'),
      ])
    router
      .group(() => {
        router
          .get('/tasks/creation-access', [CheckCreatePermissionController, 'handle'])
          .as('tasks.creation_access.show')
        router
          .get('/tasks/status-groups', [ListTasksGroupedController, 'handle'])
          .as('tasks.status_groups.index')
        router
          .get('/tasks/timeline-items', [ListTasksTimelineController, 'handle'])
          .as('tasks.timeline_items.index')
        router
          .patch('/tasks/batch-status', [BatchUpdateTaskStatusController, 'handle'])
          .as('tasks.statuses.batch.update')
        router
          .patch('/tasks/:taskId/sort-order', [UpdateTaskSortOrderController, 'handle'])
          .as('tasks.sort_order.update')
        router
          .get('/tasks/:taskId', [ShowTaskApiController, 'handle'])
          .where('taskId', router.matchers.uuid())
          .as('tasks.show')
        router
          .get('/tasks/:taskId/audit-logs', [GetTaskAuditLogsController, 'handle'])
          .as('tasks.audit_logs.index')
        router
          .get('/tasks/:taskId/submission', [TaskSubmissionController, 'show'])
          .as('tasks.submission.show')
        router
          .post('/tasks/:taskId/submission', [TaskSubmissionController, 'saveDraft'])
          .as('tasks.submission.store')
        router
          .patch('/tasks/:taskId/submission', [TaskSubmissionController, 'saveDraft'])
          .as('tasks.submission.update')
        router
          .post('/tasks/:taskId/submission/submit', [TaskSubmissionController, 'submit'])
          .as('tasks.submission.submit')
        router
          .post('/tasks/:taskId/submission/lock', [TaskSubmissionController, 'lock'])
          .as('tasks.submission.lock')
        router
          .get('/task-submissions/:submissionId/evidences', [
            TaskSubmissionController,
            'listEvidences',
          ])
          .as('task_submissions.evidences.index')
        router
          .post('/task-submissions/:submissionId/evidences', [
            TaskSubmissionController,
            'addEvidence',
          ])
          .as('task_submissions.evidences.store')
        router
          .delete('/task-submissions/:submissionId/evidences/:evidenceId', [
            TaskSubmissionController,
            'deleteEvidence',
          ])
          .as('task_submissions.evidences.destroy')
        router
          .get('/tasks/:taskId/comments', [TaskSubmissionController, 'listComments'])
          .as('tasks.comments.index')
        router
          .post('/tasks/:taskId/comments', [TaskSubmissionController, 'createComment'])
          .as('tasks.comments.store')
        router
          .patch('/tasks/:taskId/comments/:commentId', [
            TaskSubmissionController,
            'updateComment',
          ])
          .as('tasks.comments.update')
        router
          .delete('/tasks/:taskId/comments/:commentId', [
            TaskSubmissionController,
            'deleteComment',
          ])
          .as('tasks.comments.destroy')
        router
          .get('/tasks/:taskId/attachments', [TaskSubmissionController, 'listAttachments'])
          .as('tasks.attachments.index')
        router
          .post('/tasks/:taskId/attachments', [TaskSubmissionController, 'createAttachment'])
          .as('tasks.attachments.store')
        router
          .delete('/tasks/:taskId/attachments/:attachmentId', [
            TaskSubmissionController,
            'deleteAttachment',
          ])
          .as('tasks.attachments.destroy')
      })
      .prefix('/api/v1')
      .as('api.v1')
      .use([
        middleware.bindHttpTransport('api-canonical'),
        middleware.bindApiAuthContract('bearer-or-session'),
      ])

    router.get('/tasks/create', [CreateTaskController, 'showForm']).as('tasks.create')
    router.post('/tasks', [CreateTaskController, 'handle']).as('tasks.store')
    router
      .get('/tasks/:taskId', [ShowTaskController, 'handle'])
      .where('taskId', router.matchers.uuid())
      .as('tasks.show')
    router.get('/tasks/:taskId/edit', [EditTaskController, 'showForm']).as('tasks.edit')
    router.put('/tasks/:taskId', [EditTaskController, 'handle']).as('tasks.update')
    router
      .put('/tasks/:taskId/status', [UpdateTaskStatusController, 'handle'])
      .as('tasks.update.status')
    router
      .patch('/tasks/:taskId/time', [UpdateTaskTimeController, 'handle'])
      .as('tasks.update.time')
    router.delete('/tasks/:taskId', [DeleteTaskController, 'handle']).as('tasks.destroy')
    // Audit logs routes for tasks
    router
      .get('/tasks/:taskId/audit-logs', [GetTaskAuditLogsController, 'handle'])
      .as('tasks.audit_logs')

    // ── Task Status list — any org member ────────────────────────────────
    router
      .get('/api/task-statuses', [ListTaskStatusesController, 'handle'])
      .as('api.task_statuses.index')
      .use([
        middleware.bindHttpTransport('api-compat'),
        middleware.bindApiAuthContract('session-or-bearer'),
      ])

    // ── Workflow read — any org member ──────────────────────────────────
    router
      .get('/api/workflow', [ListWorkflowController, 'handle'])
      .as('api.task_statuses.workflow.index')
      .use([
        middleware.bindHttpTransport('api-compat'),
        middleware.bindApiAuthContract('session-or-bearer'),
      ])
  })
  .use([middleware.auth(), middleware.requireOrg(), throttle])

// ── Task Status mutation + Workflow mutation — admin/owner only ──────
router
  .group(() => {
    router.post('/task-statuses', [CreateTaskStatusController, 'handle']).as('api.task_statuses.store')
    router
      .put('/task-statuses/:taskStatusId', [UpdateTaskStatusDefinitionController, 'handle'])
      .as('api.task_statuses.replace')
    router
      .patch('/task-statuses/:taskStatusId', [UpdateTaskStatusDefinitionController, 'handle'])
      .as('api.task_statuses.update')
    router
      .delete('/task-statuses/:taskStatusId', [DeleteTaskStatusController, 'handle'])
      .as('api.task_statuses.destroy')

    router
      .put('/workflow', [ReplaceTaskWorkflowTransitionsController, 'handle'])
      .as('api.task_statuses.workflow.update')
  })
  .prefix('/api')
  .use([
    middleware.bindHttpTransport('api-compat'),
    middleware.bindApiAuthContract('session-or-bearer'),
    middleware.auth(),
    middleware.requireOrg(),
    middleware.requireOrgAdmin(),
    throttle,
  ])
