import router from '@adonisjs/core/services/router'

import { middleware } from '#start/kernel'

const MarketplaceController = () => import('#modules/marketplace/controllers/marketplace_controller')
const ListMarketplaceTasksController = () =>
  import('#modules/marketplace/controllers/list_marketplace_tasks_controller')
const ListMarketplaceTasksApiController = () =>
  import('#modules/marketplace/controllers/list_marketplace_tasks_api_controller')
const ApplyMarketplaceTaskController = () =>
  import('#modules/marketplace/controllers/apply_marketplace_task_controller')
const WithdrawMarketplaceApplicationController = () =>
  import('#modules/marketplace/controllers/withdraw_marketplace_application_controller')
const MyMarketplaceApplicationsController = () =>
  import('#modules/marketplace/controllers/my_marketplace_applications_controller')
const ListMarketplaceTaskApplicationsController = () =>
  import('#modules/marketplace/controllers/list_marketplace_task_applications_controller')
const ProcessMarketplaceApplicationController = () =>
  import('#modules/marketplace/controllers/process_marketplace_application_controller')
const MarketplaceMatchScoresController = () =>
  import('#modules/marketplace/controllers/marketplace_match_scores_controller')

router.group(() => {
  router.get('/marketplace', [MarketplaceController, 'index']).as('marketplace.index')
  router
    .get('/marketplace/talents', [MarketplaceController, 'talents'])
    .as('marketplace.talents.legacy')
  router
    .get('/marketplace/bookmarks', [MarketplaceController, 'bookmarks'])
    .as('marketplace.bookmarks.legacy')
  router
    .get('/marketplace/tasks', [ListMarketplaceTasksController, 'handle'])
    .as('marketplace.tasks')
  router
    .get('/api/marketplace/tasks', [ListMarketplaceTasksApiController, 'handle'])
    .as('api.marketplace.tasks.index')
    .use([
      middleware.bindHttpTransport('api-compat'),
      middleware.bindApiAuthContract('session-or-bearer'),
    ])
  router
    .group(() => {
      router
        .get('/marketplace/tasks', [ListMarketplaceTasksApiController, 'handle'])
        .as('marketplace.tasks.index')
      router
        .post('/tasks/:taskId/apply', [ApplyMarketplaceTaskController, 'handle'])
        .as('tasks.applications.store')
      router
        .get('/tasks/:taskId/applications/:applicationId/match', [
          MarketplaceMatchScoresController,
          'show',
        ])
        .as('tasks.applications.match')
      router
        .get('/tasks/:taskId/applications/ranking', [
          MarketplaceMatchScoresController,
          'ranking',
        ])
        .as('tasks.applications.ranking')
    })
    .prefix('/api/v1')
    .as('api.v1')
    .use([
      middleware.bindHttpTransport('api-canonical'),
      middleware.bindApiAuthContract('bearer-or-session'),
    ])
  router
    .post('/api/tasks/:taskId/apply', [ApplyMarketplaceTaskController, 'handle'])
    .as('api.tasks.applications.store')
    .use([
      middleware.bindHttpTransport('api-compat'),
      middleware.bindApiAuthContract('session-or-bearer'),
    ])
  router
    .post('/applications/:applicationId/withdraw', [
      WithdrawMarketplaceApplicationController,
      'handle',
    ])
    .as('applications.withdrawals.store')
  router
    .post('/applications/:applicationId/process', [
      ProcessMarketplaceApplicationController,
      'handle',
    ])
    .as('applications.decisions.store')
  router
    .get('/my-applications', [MyMarketplaceApplicationsController, 'handle'])
    .as('me.applications.index')
  router
    .get('/tasks/:taskId/applications', [ListMarketplaceTaskApplicationsController, 'handle'])
    .as('tasks.applications')
  router
    .get('/api/tasks/:taskId/applications/:applicationId/match', [
      MarketplaceMatchScoresController,
      'show',
    ])
    .as('api.tasks.applications.match')
    .use([
      middleware.bindHttpTransport('api-compat'),
      middleware.bindApiAuthContract('session-or-bearer'),
    ])
  router
    .get('/api/tasks/:taskId/applications/ranking', [
      MarketplaceMatchScoresController,
      'ranking',
    ])
    .as('api.tasks.applications.ranking')
    .use([
      middleware.bindHttpTransport('api-compat'),
      middleware.bindApiAuthContract('session-or-bearer'),
    ])
}).use(middleware.auth())
