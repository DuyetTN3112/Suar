import router from '@adonisjs/core/services/router'
import { middleware } from '../kernel.js'

// User controllers
const UserController = () => import('#controllers/users/user_controller')
const UsersController = () => import('#controllers/users/users_controller')
const ProfileController = () => import('#controllers/users/profile_controller')

router
  .group(() => {
    // Users routes
    router.get('/users', [UsersController, 'index']).as('users.index')
    router.get('/users/create', [UsersController, 'create']).as('users.create')
    router.post('/users', [UsersController, 'store']).as('users.store')
    router.get('/users/:id', [UsersController, 'show']).as('users.show')
    router.get('/users/:id/edit', [UsersController, 'edit']).as('users.edit')
    router.put('/users/:id', [UsersController, 'update']).as('users.update')
    router.delete('/users/:id', [UsersController, 'destroy']).as('users.destroy')

    // Legacy user routes
    router.get('/user', [UserController, 'index']).as('user.index')
    router.get('/user/create', [UserController, 'create']).as('user.create')
    router.post('/user', [UserController, 'store']).as('user.store')
    router.get('/user/:id', [UserController, 'show']).as('user.show')
    router.get('/user/:id/edit', [UserController, 'edit']).as('user.edit')
    router.put('/user/:id', [UserController, 'update']).as('user.update')
    router.delete('/user/:id', [UserController, 'destroy']).as('user.destroy')

    // Profile routes
    router.get('/profile', [ProfileController, 'show']).as('profile.show')
    router.put('/profile', [ProfileController, 'update']).as('profile.update')
    router
      .put('/profile/settings', [ProfileController, 'updateSettings'])
      .as('profile.update_settings')
  })
  .use([middleware.auth(), middleware.requireOrg()])
