import type { HttpContext } from '@adonisjs/core/http'
import router from '@adonisjs/core/services/router'

import { middleware } from '../kernel.js'

import { throttle } from '#start/limiter'

// Users — use-case controllers
const ListUsersController = () => import('#modules/users/controllers/list_users_controller')
const CreateUserController = () => import('#modules/users/controllers/create_user_controller')
const StoreUserController = () => import('#modules/users/controllers/store_user_controller')
const ShowUserController = () => import('#modules/users/controllers/show_user_controller')
const EditUserController = () => import('#modules/users/controllers/edit_user_controller')
const UpdateUserController = () => import('#modules/users/controllers/update_user_controller')
const DeleteUserController = () => import('#modules/users/controllers/delete_user_controller')
const ApproveUserController = () => import('#modules/users/controllers/approve_user_controller')
const UpdateUserRoleController = () =>
  import('#modules/users/controllers/update_user_role_controller')
const PendingApprovalUsersController = () =>
  import('#modules/users/controllers/pending_approval_users_controller')
const PendingApprovalUsersApiController = () =>
  import('#modules/users/controllers/pending_approval_users_api_controller')
const PendingApprovalCountApiController = () =>
  import('#modules/users/controllers/pending_approval_count_api_controller')
const SystemUsersApiController = () =>
  import('#modules/users/controllers/system_users_api_controller')
const TalentsSearchController = () =>
  import('#modules/users/controllers/talents_search_controller')
const TalentDetailController = () =>
  import('#modules/users/controllers/talent_detail_controller')
const TalentDirectoryPageController = () =>
  import('#modules/users/controllers/talent_directory_page_controller')
const RecruiterBookmarksWorkspaceController = () =>
  import('#modules/users/controllers/recruiter_bookmarks_workspace_controller')
const RecruiterBookmarksController = () =>
  import('#modules/users/controllers/recruiter_bookmarks_controller')

// Profile — use-case controllers
const ShowProfileController = () => import('#modules/users/controllers/show_profile_controller')
const EditProfileController = () => import('#modules/users/controllers/edit_profile_controller')
const UpdateProfileDetailsController = () =>
  import('#modules/users/controllers/update_profile_details_controller')
const AddProfileSkillController = () =>
  import('#modules/users/controllers/add_profile_skill_controller')
const UpdateProfileSkillController = () =>
  import('#modules/users/controllers/update_profile_skill_controller')
const RemoveProfileSkillController = () =>
  import('#modules/users/controllers/remove_profile_skill_controller')
const ViewUserProfileController = () =>
  import('#modules/users/controllers/view_user_profile_controller')
const PublishProfileSnapshotController = () =>
  import('#modules/users/controllers/publish_profile_snapshot_controller')
const GetPublicProfileSnapshotController = () =>
  import('#modules/users/controllers/get_public_profile_snapshot_controller')
const GetCurrentProfileSnapshotController = () =>
  import('#modules/users/controllers/get_current_profile_snapshot_controller')
const GetProfileSnapshotHistoryController = () =>
  import('#modules/users/controllers/get_profile_snapshot_history_controller')
const UpdateProfileSnapshotAccessController = () =>
  import('#modules/users/controllers/update_profile_snapshot_access_controller')
const RotateProfileSnapshotShareLinkController = () =>
  import('#modules/users/controllers/rotate_profile_snapshot_share_link_controller')

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

    router
      .get('/marketplace/talents', [TalentDirectoryPageController, 'handle'])
      .as('marketplace.talents')
    router
      .get('/marketplace/bookmarks', [RecruiterBookmarksWorkspaceController, 'handle'])
      .as('marketplace.bookmarks')

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
    router
      .get('/api/talents/search', [TalentsSearchController, 'handle'])
      .as('api.talents.search')
    router
      .get('/api/org/talents/search', [TalentsSearchController, 'handle'])
      .as('api.org.talents.search')
    router
      .get('/api/org/talents/:userId', [TalentDetailController, 'handle'])
      .as('api.org.talents.show')
    router
      .get('/api/recruiter-bookmarks', [RecruiterBookmarksController, 'index'])
      .as('api.recruiter_bookmarks.index')
    router
      .post('/api/recruiter-bookmarks', [RecruiterBookmarksController, 'store'])
      .as('api.recruiter_bookmarks.store')
    router
      .patch('/api/recruiter-bookmarks/:id', [RecruiterBookmarksController, 'update'])
      .as('api.recruiter_bookmarks.update')
    router
      .delete('/api/recruiter-bookmarks/:id', [RecruiterBookmarksController, 'destroy'])
      .as('api.recruiter_bookmarks.destroy')
    router
      .get('/api/recruiters/bookmarks', [RecruiterBookmarksController, 'index'])
      .as('api.recruiters.bookmarks.index')
    router
      .post('/api/recruiters/bookmarks', [RecruiterBookmarksController, 'store'])
      .as('api.recruiters.bookmarks.store')
    router
      .patch('/api/recruiters/bookmarks/:id', [RecruiterBookmarksController, 'update'])
      .as('api.recruiters.bookmarks.update')
    router
      .delete('/api/recruiters/bookmarks/:id', [RecruiterBookmarksController, 'destroy'])
      .as('api.recruiters.bookmarks.destroy')
    router
      .post('/api/org/talents/:userId/bookmarks', [RecruiterBookmarksController, 'store'])
      .as('api.org.talents.bookmarks.store')
    router
      .delete('/api/org/talents/:userId/bookmarks', [
        RecruiterBookmarksController,
        'destroyByTalent',
      ])
      .as('api.org.talents.bookmarks.destroy')

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

    // Profile snapshots
    router
      .post('/profile/snapshots/publish', [PublishProfileSnapshotController, 'handle'])
      .as('profile.snapshots.publish')
    router
      .post('/api/me/profile-snapshots', [PublishProfileSnapshotController, 'handle'])
      .as('api.me.profile_snapshots.publish')
    router
      .get('/profile/snapshots/current', [GetCurrentProfileSnapshotController, 'handle'])
      .as('profile.snapshots.current')
    router
      .get('/api/me/profile-snapshots/current', [GetCurrentProfileSnapshotController, 'handle'])
      .as('api.me.profile_snapshots.current')
    router
      .get('/profile/snapshots/history', [GetProfileSnapshotHistoryController, 'handle'])
      .as('profile.snapshots.history')
    router
      .get('/api/me/profile-snapshots', [GetProfileSnapshotHistoryController, 'handle'])
      .as('api.me.profile_snapshots.index')
    router
      .patch('/profile/snapshots/:id/access', [UpdateProfileSnapshotAccessController, 'handle'])
      .as('profile.snapshots.access')
    router
      .patch('/api/me/profile-snapshots/:id/access', [
        UpdateProfileSnapshotAccessController,
        'handle',
      ])
      .as('api.me.profile_snapshots.access')
    router
      .post('/profile/snapshots/:id/rotate-link', [
        RotateProfileSnapshotShareLinkController,
        'handle',
      ])
      .as('profile.snapshots.rotate_link')
    router
      .post('/api/me/profile-snapshots/:id/rotate-link', [
        RotateProfileSnapshotShareLinkController,
        'handle',
      ])
      .as('api.me.profile_snapshots.rotate_link')

    // @deprecated - Settings moved to settings controller
    router
      .put('/profile/settings', ({ response, session }: HttpContext) => {
        session.flash('info', 'This feature has been moved to the settings page')
        response.redirect().toRoute('settings.index')
      })
      .as('profile.update_settings')
  })
  .use([middleware.auth(), middleware.requireOrg(), throttle])

// Public snapshot route (no auth required)
router
  .get('/profiles/:slug', [GetPublicProfileSnapshotController, 'handle'])
  .as('profile.snapshot.public')
