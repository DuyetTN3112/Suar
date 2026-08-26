import router from '@adonisjs/core/services/router'

import { middleware } from '../kernel.js'

import { apiThrottle } from '#start/limiter'

/**
 * Canonical v1 casing contract:
 * - public JSON request/response fields => camelCase
 * - persistence / DB fields => snake_case
 * - route names stay lowercase dot-separated, multiword tokens use snake_case
 */

const ShowMeController = () => import('#modules/http/controllers/v1/show_me_controller')

const ShowSettingsController = () => import('#modules/settings/controllers/v1/show_settings_controller')
const UpdateSettingsController = () =>
  import('#modules/settings/controllers/v1/update_settings_controller')

const ListNotificationsController = () =>
  import('#modules/notifications/controllers/v1/list_notifications_controller')
const MarkNotificationReadController = () =>
  import('#modules/notifications/controllers/v1/mark_notification_read_controller')
const DeleteNotificationController = () =>
  import('#modules/notifications/controllers/v1/delete_notification_controller')

const ListTaskStatusesController = () =>
  import('#modules/tasks/controllers/v1/list_task_statuses_controller')
const ShowTaskStatusController = () =>
  import('#modules/tasks/controllers/v1/show_task_status_controller')
const CreateTaskStatusController = () =>
  import('#modules/tasks/controllers/v1/create_task_status_controller')
const UpdateTaskStatusController = () =>
  import('#modules/tasks/controllers/task-status/update_task_status_definition_controller')
const DeleteTaskStatusController = () =>
  import('#modules/tasks/controllers/v1/delete_task_status_controller')
const ListWorkflowController = () =>
  import('#modules/tasks/controllers/v1/list_workflow_controller')
const ReplaceTaskWorkflowTransitionsV1Controller = () =>
  import('#modules/tasks/controllers/v1/replace_task_workflow_transitions_controller')
const GetProjectDetailApiController = () =>
  import('#modules/projects/controllers/project-context/get_project_detail_api_controller')
const GetProjectTaskAuthoringContextController = () =>
  import('#modules/projects/controllers/project-context/get_project_task_authoring_context_controller')
const UpdateProjectApiController = () =>
  import('#modules/projects/controllers/project-context/update_project_api_controller')
const DeleteProjectApiController = () =>
  import('#modules/projects/controllers/project-context/delete_project_api_controller')
const PublishProjectContextController = () =>
  import('#modules/projects/controllers/project-context/publish_project_context_controller')
const ShowOrganizationApiController = () =>
  import('#modules/organizations/controllers/directory/show_organization_api_controller')
const UpdateOrganizationApiController = () =>
  import('#modules/organizations/controllers/directory/update_organization_api_controller')
const DeleteOrganizationApiController = () =>
  import('#modules/organizations/controllers/directory/delete_organization_api_controller')
const GetOrganizationMembersApiController = () =>
  import('#modules/http/controllers/organization/get_organization_members_api_controller')
const GetUsersInOrganizationApiController = () =>
  import('#modules/http/controllers/organization/get_users_in_organization_api_controller')
const PublishAccomplishmentPublicationController = () =>
  import('#modules/accomplishments/controllers/publication/publish_accomplishment_publication_controller')
const UnpublishAccomplishmentPublicationController = () =>
  import('#modules/accomplishments/controllers/publication/unpublish_accomplishment_publication_controller')
const FilterContextsController = () =>
  import('#modules/filtering/controllers/filter_contexts_controller')
const FilterQueryController = () => import('#modules/filtering/controllers/filter_query_controller')
const FilterSavedViewsController = () =>
  import('#modules/filtering/controllers/filter_saved_views_controller')
const TaskAssignmentInteractionController = () =>
  import('#modules/tasks/controllers/task-assignment/task_assignment_interaction_controller')
const TaskSubmissionController = () => import('#modules/tasks/controllers/task_submission_controller')

// Read-only routes — any authenticated user
router
  .group(() => {
    router
      .post('/task-assignments/:assignmentId/acknowledgement', [
        TaskAssignmentInteractionController,
        'acknowledge',
      ])
      .as('task_assignments.acknowledgement.store')
    router
      .post('/task-assignments/:assignmentId/clarifications', [
        TaskAssignmentInteractionController,
        'requestClarification',
      ])
      .as('task_assignments.clarifications.store')
    router
      .get('/task-assignments/:assignmentId/completion-report', [
        TaskSubmissionController,
        'showCompletionReport',
      ])
      .as('task_assignments.completion_reports.show')
    router
      .get('/task-completion-reports/:reportId/review-package', [
        TaskSubmissionController,
        'showCompletionReviewPackage',
      ])
      .as('task_completion_reports.review_packages.show')
    router
      .post('/task-assignments/:assignmentId/completion-report/start', [
        TaskSubmissionController,
        'startCompletionReport',
      ])
      .as('task_assignments.completion_reports.start')
    router
      .post('/task-assignments/:assignmentId/completion-report', [
        TaskSubmissionController,
        'saveCompletionReportDraft',
      ])
      .as('task_assignments.completion_reports.store')
    router
      .post('/task-assignments/:assignmentId/completion-report/submit', [
        TaskSubmissionController,
        'submitCompletionReport',
      ])
      .as('task_assignments.completion_reports.submit')
    router
      .post('/accomplishments/:accomplishmentId/publication', [
        PublishAccomplishmentPublicationController,
        'handle',
      ])
      .as('accomplishments.publication.store')
    router
      .delete('/accomplishments/:accomplishmentId/publication', [
        UnpublishAccomplishmentPublicationController,
        'handle',
      ])
      .as('accomplishments.publication.destroy')
    router
      .get('/filter/contexts/:context', [FilterContextsController, 'handle'])
      .as('filter.contexts.show')
    router.post('/filter/query', [FilterQueryController, 'handle']).as('filter.query.store')
    router.get('/filter-saved-views', [FilterSavedViewsController, 'index']).as('filter_saved_views.index')
    router.post('/filter-saved-views', [FilterSavedViewsController, 'store']).as('filter_saved_views.store')
    router.get('/filter-saved-views/:viewId', [FilterSavedViewsController, 'show']).as('filter_saved_views.show')
    router.put('/filter-saved-views/:viewId', [FilterSavedViewsController, 'update']).as('filter_saved_views.update')
    router.delete('/filter-saved-views/:viewId', [FilterSavedViewsController, 'destroy']).as('filter_saved_views.destroy')
    router.post('/filter-saved-views/:viewId/duplicate', [FilterSavedViewsController, 'duplicate']).as('filter_saved_views.duplicate')
    router.post('/filter-saved-views/:viewId/share', [FilterSavedViewsController, 'share']).as('filter_saved_views.share')
    router.get('/filter-saved-views/:viewId/alert', [FilterSavedViewsController, 'showAlert']).as('filter_saved_views.alert.show')
    router.post('/filter-saved-views/:viewId/alert', [FilterSavedViewsController, 'storeAlert']).as('filter_saved_views.alert.store')
    router.put('/filter-saved-views/:viewId/alert', [FilterSavedViewsController, 'updateAlert']).as('filter_saved_views.alert.update')
    router.delete('/filter-saved-views/:viewId/alert', [FilterSavedViewsController, 'updateAlert']).as('filter_saved_views.alert.destroy')
  })
  .prefix('/api/v1')
  .as('api.v1')
  .use([
    middleware.bindHttpTransport('api-canonical'),
    middleware.bindApiAuthContract('bearer-or-session'),
    middleware.auth(),
    apiThrottle,
  ])

// Mutation routes — admin/owner only
router
  .group(() => {
    router.get('/me', [ShowMeController, 'handle']).as('me.show')
    router.get('/me/settings', [ShowSettingsController, 'handle']).as('me.settings.show')
    router.patch('/me/settings', [UpdateSettingsController, 'handle']).as('me.settings.update')

    router.get('/notifications', [ListNotificationsController, 'handle']).as('notifications.index')
    router
      .post('/notifications/read-all', [MarkNotificationReadController, 'markAll'])
      .as('notifications.read_statuses.update')
    router
      .post('/notifications/:notificationId/read', [MarkNotificationReadController, 'markOne'])
      .as('notifications.read_status.update')
    router
      .delete('/notifications/read', [DeleteNotificationController, 'destroyAllRead'])
      .as('notifications.read_notifications.destroy')
    router
      .delete('/notifications/:notificationId', [DeleteNotificationController, 'destroy'])
      .as('notifications.destroy')
  })
  .prefix('/api/v1')
  .as('api.v1')
  .use([
    middleware.bindHttpTransport('api-canonical'),
    middleware.bindApiAuthContract('bearer-or-session'),
    middleware.auth(),
    apiThrottle,
  ])

// Project Context and Work Package authoring mutations.
router
  .group(() => {
    router
      .post('/projects/:projectId/context-versions', [
        PublishProjectContextController,
        'publishContext',
      ])
      .as('projects.context_versions.store')
    router
      .post('/projects/:projectId/work-packages', [
        PublishProjectContextController,
        'publishWorkPackage',
      ])
      .as('projects.work_packages.store')
  })
  .prefix('/api/v1')
  .as('api.v1')
  .use([
    middleware.bindHttpTransport('api-canonical'),
    middleware.bindApiAuthContract('bearer-or-session'),
    middleware.auth(),
    middleware.requireOrg(),
    apiThrottle,
  ])

// Org-scoped read routes
router
  .group(() => {
    router.get('/task-statuses', [ListTaskStatusesController, 'handle']).as('task_statuses.index')
    router
      .get('/task-statuses/:taskStatusId', [ShowTaskStatusController, 'handle'])
      .as('task_statuses.show')
    router
      .get('/workflow', [ListWorkflowController, 'handle'])
      .as('task_statuses.workflow.index')
    router
      .get('/projects/:projectId', [GetProjectDetailApiController, 'handle'])
      .as('projects.show')
    router
      .get('/projects/:projectId/task-authoring-context', [GetProjectTaskAuthoringContextController, 'handle'])
      .as('projects.task_authoring_context.show')
    router
      .get('/organizations/:organizationId', [ShowOrganizationApiController, 'handle'])
      .as('organizations.show')
    router
      .get('/organizations/:organizationId/members', [GetOrganizationMembersApiController, 'handle'])
      .as('organizations.members.index')
    router
      .get('/me/organizations/current/users', [GetUsersInOrganizationApiController, 'handle'])
      .as('organizations.users.index')
  })
  .prefix('/api/v1')
  .as('api.v1')
  .use([
    middleware.bindHttpTransport('api-canonical'),
    middleware.bindApiAuthContract('bearer-or-session'),
    middleware.auth(),
    middleware.requireOrg(),
    apiThrottle,
  ])

// Mutation routes — admin/owner only
router
  .group(() => {
    router
      .post('/task-statuses', [CreateTaskStatusController, 'handle'])
      .as('task_statuses.store')
    router
      .patch('/task-statuses/:taskStatusId', [UpdateTaskStatusController, 'handle'])
      .as('task_statuses.update')
    router
      .delete('/task-statuses/:taskStatusId', [DeleteTaskStatusController, 'handle'])
      .as('task_statuses.destroy')
    router
      .put('/workflow', [ReplaceTaskWorkflowTransitionsV1Controller, 'handle'])
      .as('task_statuses.workflow.update')
  })
  .prefix('/api/v1')
  .as('api.v1')
  .use([
    middleware.bindHttpTransport('api-canonical'),
    middleware.bindApiAuthContract('bearer-or-session'),
    middleware.auth(),
    middleware.requireOrg(),
    middleware.requireOrgAdmin(),
    apiThrottle,
  ])

router
  .group(() => {
    router
      .patch('/projects/:projectId', [UpdateProjectApiController, 'handle'])
      .as('projects.update')
    router
      .delete('/projects/:projectId', [DeleteProjectApiController, 'handle'])
      .as('projects.destroy')
    router
      .patch('/organizations/:organizationId', [UpdateOrganizationApiController, 'handle'])
      .as('organizations.update')
    router
      .delete('/organizations/:organizationId', [DeleteOrganizationApiController, 'handle'])
      .as('organizations.destroy')
  })
  .prefix('/api/v1')
  .as('api.v1')
  .use([
    middleware.bindHttpTransport('api-canonical'),
    middleware.bindApiAuthContract('bearer-or-session'),
    middleware.auth(),
    middleware.requireOrg(),
    apiThrottle,
  ])
