import router from '@adonisjs/core/services/router'
import { middleware } from '../kernel.js'

// User controllers
const UserController = () => import('#controllers/users/user_controller')
const UsersController = () => import('#controllers/users/users_controller')
const ProfileController = () => import('#controllers/users/profile_controller')
const AvatarController = () => import('#controllers/users/avatar_controller')

router
  .group(() => {
    // Users routes
    router.get('/users', [UsersController, 'index']).as('users.index')
    router.get('/users/create', [UsersController, 'create']).as('users.create')
    router
      .get('/users/pending-approval', [UsersController, 'pendingApproval'])
      .as('users.pending_approval')
    router.post('/users', [UsersController, 'store']).as('users.store')
    router.get('/users/:id', [UsersController, 'show']).as('users.show')
    router.get('/users/:id/edit', [UsersController, 'edit']).as('users.edit')
    router.put('/users/:id', [UsersController, 'update']).as('users.update')
    router.delete('/users/:id', [UsersController, 'destroy']).as('users.destroy')
    router.put('/users/:id/approve', [UserController, 'approve']).as('users.approve')

    // API routes
    router
      .get('/api/users/pending-approval', [UsersController, 'pendingApprovalApi'])
      .as('api.users.pending_approval')
    router
      .get('/api/users/pending-approval/count', [UsersController, 'pendingApprovalCount'])
      .as('api.users.pending_approval_count')
    router
      .get('/api/system-users', [UsersController, 'systemUsersApi'])
      .as('api.users.system_users')

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
    // Avatar routes
    router.post('/profile/avatar', [AvatarController, 'update']).as('profile.update_avatar')
  })
  .use([middleware.auth(), middleware.requireOrg()])
