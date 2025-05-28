import router from '@adonisjs/core/services/router'
import { middleware } from '../kernel.js'

// User controllers (Refactored with CQRS)
const UsersController = () => import('#controllers/users/users_controller')
const ProfileController = () => import('#controllers/users/profile_controller')

router
  .group(() => {
    // Users routes (CQRS refactored)
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
    router.put('/users/:id/approve', [UsersController, 'approve']).as('users.approve')
    router.put('/users/:id/role', [UsersController, 'updateRole']).as('users.update_role')

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

    // Profile routes - Enhanced with CQRS
    router.get('/profile', [ProfileController, 'show']).as('profile.show')
    router.get('/profile/edit', [ProfileController, 'edit']).as('profile.edit')
    router.put('/profile/details', [ProfileController, 'updateDetails']).as('profile.updateDetails')

    // Profile skills management
    router.post('/profile/skills', [ProfileController, 'addSkill']).as('profile.skills.add')
    router
      .put('/profile/skills/:id', [ProfileController, 'updateSkill'])
      .as('profile.skills.update')
    router
      .delete('/profile/skills/:id', [ProfileController, 'removeSkill'])
      .as('profile.skills.remove')

    // View other user's public profile
    router.get('/users/:id/profile', [ProfileController, 'viewUser']).as('profile.viewUser')

    // @deprecated - Settings moved to settings controller
    router
      .put('/profile/settings', [ProfileController, 'updateSettings'])
      .as('profile.update_settings')
  })
  .use([middleware.auth(), middleware.requireOrg()])
