import router from '@adonisjs/core/services/router'
import type { HttpContext } from '@adonisjs/core/http'
import { middleware } from '../kernel.js'
import { throttle } from '#start/limiter'

// Users — use-case controllers
const ListUsersController = () => import('#controllers/users/list_users_controller')
const CreateUserController = () => import('#controllers/users/create_user_controller')
const StoreUserController = () => import('#controllers/users/store_user_controller')
const ShowUserController = () => import('#controllers/users/show_user_controller')
const EditUserController = () => import('#controllers/users/edit_user_controller')
const UpdateUserController = () => import('#controllers/users/update_user_controller')
const DeleteUserController = () => import('#controllers/users/delete_user_controller')
const ApproveUserController = () => import('#controllers/users/approve_user_controller')
const UpdateUserRoleController = () => import('#controllers/users/update_user_role_controller')
const PendingApprovalUsersController = () =>
  import('#controllers/users/pending_approval_users_controller')
const PendingApprovalUsersApiController = () =>
  import('#controllers/users/pending_approval_users_api_controller')
const PendingApprovalCountApiController = () =>
  import('#controllers/users/pending_approval_count_api_controller')
const SystemUsersApiController = () => import('#controllers/users/system_users_api_controller')

// Profile — use-case controllers
const ShowProfileController = () => import('#controllers/users/show_profile_controller')
const EditProfileController = () => import('#controllers/users/edit_profile_controller')
const UpdateProfileDetailsController = () =>
  import('#controllers/users/update_profile_details_controller')
const AddProfileSkillController = () => import('#controllers/users/add_profile_skill_controller')
const UpdateProfileSkillController = () =>
  import('#controllers/users/update_profile_skill_controller')
const RemoveProfileSkillController = () =>
  import('#controllers/users/remove_profile_skill_controller')
const ViewUserProfileController = () => import('#controllers/users/view_user_profile_controller')

router
  .group(() => {
    // Users routes (use-case controllers)
    router.get('/users', [ListUsersController, 'handle']).as('users.index')
    router.get('/users/create', [CreateUserController, 'handle']).as('users.create')
    router
      .get('/users/pending-approval', [PendingApprovalUsersController, 'handle'])
      .as('users.pending_approval')
    router.post('/users', [StoreUserController, 'handle']).as('users.store')
    router.get('/users/:id', [ShowUserController, 'handle']).as('users.show')
    router.get('/users/:id/edit', [EditUserController, 'handle']).as('users.edit')
    router.put('/users/:id', [UpdateUserController, 'handle']).as('users.update')
    router.delete('/users/:id', [DeleteUserController, 'handle']).as('users.destroy')
    router.put('/users/:id/approve', [ApproveUserController, 'handle']).as('users.approve')
    router.put('/users/:id/role', [UpdateUserRoleController, 'handle']).as('users.update_role')

    // API routes
    router
      .get('/api/users/pending-approval', [PendingApprovalUsersApiController, 'handle'])
      .as('api.users.pending_approval')
    router
      .get('/api/users/pending-approval/count', [PendingApprovalCountApiController, 'handle'])
      .as('api.users.pending_approval_count')
    router
      .get('/api/system-users', [SystemUsersApiController, 'handle'])
      .as('api.users.system_users')

    // Profile routes (use-case controllers)
    router.get('/profile', [ShowProfileController, 'handle']).as('profile.show')
    router.get('/profile/edit', [EditProfileController, 'handle']).as('profile.edit')
    router
      .put('/profile/details', [UpdateProfileDetailsController, 'handle'])
      .as('profile.updateDetails')

    // Profile skills management
    router.post('/profile/skills', [AddProfileSkillController, 'handle']).as('profile.skills.add')
    router
      .put('/profile/skills/:id', [UpdateProfileSkillController, 'handle'])
      .as('profile.skills.update')
    router
      .delete('/profile/skills/:id', [RemoveProfileSkillController, 'handle'])
      .as('profile.skills.remove')

    // View other user's public profile
    router.get('/users/:id/profile', [ViewUserProfileController, 'handle']).as('profile.viewUser')

    // @deprecated - Settings moved to settings controller
    router
      .put('/profile/settings', ({ response, session }: HttpContext) => {
        session.flash('info', 'This feature has been moved to the settings page')
        response.redirect().toRoute('settings.index')
      })
      .as('profile.update_settings')
  })
  .use([middleware.auth(), middleware.requireOrg(), throttle])
