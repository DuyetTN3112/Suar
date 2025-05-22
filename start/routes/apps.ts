import router from '@adonisjs/core/services/router'
import { middleware } from '../kernel.js'

// Apps controllers
const AppsController = () => import('#controllers/apps/apps_controller')
const AppCategoriesController = () =>
  import('#controllers/app_categories/app_categories_controller')

router
  .group(() => {
    // Apps routes
    router.get('/apps', [AppsController, 'index']).as('apps.index')
    router.get('/apps/create', [AppsController, 'create']).as('apps.create')
    router.post('/apps', [AppsController, 'store']).as('apps.store')
    router.get('/apps/:id', [AppsController, 'show']).as('apps.show')
    router.get('/apps/:id/edit', [AppsController, 'edit']).as('apps.edit')
    router.put('/apps/:id', [AppsController, 'update']).as('apps.update')
    router.delete('/apps/:id', [AppsController, 'destroy']).as('apps.destroy')

    // App Categories routes
    router.get('/app_categories', [AppCategoriesController, 'index']).as('app_categories.index')
    router
      .get('/app_categories/create', [AppCategoriesController, 'create'])
      .as('app_categories.create')
    router.post('/app_categories', [AppCategoriesController, 'store']).as('app_categories.store')
    router
      .get('/app_categories/:id/edit', [AppCategoriesController, 'edit'])
      .as('app_categories.edit')
    router
      .put('/app_categories/:id', [AppCategoriesController, 'update'])
      .as('app_categories.update')
    router
      .delete('/app_categories/:id', [AppCategoriesController, 'destroy'])
      .as('app_categories.destroy')
  })
  .use(middleware.auth())
