import type { HttpContext } from '@adonisjs/core/http'
import router from '@adonisjs/core/services/router'

import { middleware } from '../kernel.js'

import { throttle } from '#start/limiter'

// Legacy user-directory page routes are redirects only. Organization membership
// management lives under /org; system user administration lives under /admin.
const TalentsSearchController = () => import('#modules/users/controllers/talents_search_controller')
const TalentDetailController = () => import('#modules/users/controllers/talent_detail_controller')
const OrgTalentsPageController = () =>
  import('#modules/users/controllers/org_talents_page_controller')
const OrgBookmarksPageController = () =>
  import('#modules/users/controllers/org_bookmarks_page_controller')
const RecruiterBookmarksController = () =>
  import('#modules/users/controllers/recruiter_bookmarks_controller')
const PendingApprovalUsersApiController = () =>
  import('#modules/users/controllers/pending_approval_users_api_controller')
const PendingApprovalCountApiController = () =>
  import('#modules/users/controllers/pending_approval_count_api_controller')
const ApprovePendingMemberController = () =>
  import('#modules/organizations/members/controllers/approve_pending_member_controller')

// Profile — use-case controllers
const ShowProfileController = () => import('#modules/users/controllers/show_profile_controller')
const EditProfileController = () => import('#modules/users/controllers/edit_profile_controller')
const UpdateProfileDetailsController = () =>
  import('#modules/users/controllers/update_profile_details_controller')
const UpdateProfileDiscoverabilityController = () =>
  import('#modules/users/controllers/update_profile_discoverability_controller')
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
const ProfileSnapshotsPageController = () =>
  import('#modules/users/controllers/profile_snapshots_page_controller')
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
    // Retired user-directory pages. Keep GET aliases so old bookmarks land on
    // the canonical User/Organization realm surfaces.
    router
      .get('/users', ({ response }: HttpContext) => response.redirect('/org/members'))
      .as('users.index')
    router
      .get('/users/create', ({ response }: HttpContext) => response.redirect('/org/invitations'))
      .as('users.create')
    router
      .get('/users/pending-approval', ({ response }: HttpContext) =>
        response.redirect('/org/invitations/requests')
      )
      .as('users.pending_approvals.index')
    router
      .get('/users/:userId/edit', ({ response }: HttpContext) =>
        response.redirect('/org/members')
      )
      .as('users.edit')
    router
      .put('/users/:userId/approve', [ApprovePendingMemberController, 'handle'])
      .as('users.approvals.store')
    router
      .get('/users/:userId', ({ response, params }: HttpContext) =>
        response.redirect(`/users/${String(params['userId'])}/profile`)
      )
      .as('users.show')

    router.get('/org/bookmarks', [OrgBookmarksPageController, 'handle']).as('org.bookmarks')
    router.get('/org/talents', [OrgTalentsPageController, 'index']).as('org.talents.index')
    router.get('/org/talents/:userId', [OrgTalentsPageController, 'show']).as('org.talents.show')

    // Profile routes (use-case controllers)
    router.get('/profile', [ShowProfileController, 'handle']).as('profile.show')
    router.get('/profile/edit', [EditProfileController, 'handle']).as('profile.edit')
    router
      .put('/profile/details', [UpdateProfileDetailsController, 'handle'])
      .as('profile.details.update')
    router
      .patch('/profile/discoverability', [UpdateProfileDiscoverabilityController, 'handle'])
      .as('profile.discoverability.update')

    // Invitations
    const MyInvitationsPageController = () =>
      import('#modules/users/controllers/my_invitations_page_controller')
    router
      .get('/profile/invitations', [MyInvitationsPageController, 'handle'])
      .as('profile.invitations.index')

    // Profile skills management
    router.post('/profile/skills', [AddProfileSkillController, 'handle']).as('profile.skills.store')
    router
      .put('/profile/skills/:skillId', [UpdateProfileSkillController, 'handle'])
      .as('profile.skills.update')
    router
      .delete('/profile/skills/:skillId', [RemoveProfileSkillController, 'handle'])
      .as('profile.skills.destroy')

    // View other user's public profile
    router
      .get('/users/:userId/profile', [ViewUserProfileController, 'handle'])
      .as('profile.user.show')

    // Profile snapshots
    router
      .get('/profile/snapshots', [ProfileSnapshotsPageController, 'handle'])
      .as('profile.snapshots.index')
    router
      .post('/profile/snapshots/publish', [PublishProfileSnapshotController, 'handle'])
      .as('profile.snapshots.store')
    router
      .post('/api/me/profile-snapshots', [PublishProfileSnapshotController, 'handle'])
      .as('api.me.profile_snapshots.store')
      .use([middleware.bindHttpTransport('api-compat')])
    router
      .get('/profile/snapshots/current', [GetCurrentProfileSnapshotController, 'handle'])
      .as('profile.snapshots.current')
    router
      .get('/api/me/profile-snapshots/current', [GetCurrentProfileSnapshotController, 'handle'])
      .as('api.me.profile_snapshots.current.show')
      .use([middleware.bindHttpTransport('api-compat')])
    router
      .get('/profile/snapshots/history', [GetProfileSnapshotHistoryController, 'handle'])
      .as('profile.snapshots.history')
    router
      .get('/api/me/profile-snapshots', [GetProfileSnapshotHistoryController, 'handle'])
      .as('api.me.profile_snapshots.index')
      .use([middleware.bindHttpTransport('api-compat')])
    router
      .patch('/profile/snapshots/:snapshotId/access', [
        UpdateProfileSnapshotAccessController,
        'handle',
      ])
      .as('profile.snapshots.access.update')
    router
      .patch('/api/me/profile-snapshots/:snapshotId/access', [
        UpdateProfileSnapshotAccessController,
        'handle',
      ])
      .as('api.me.profile_snapshots.access.update')
      .use([middleware.bindHttpTransport('api-compat')])
    router
      .post('/profile/snapshots/:snapshotId/rotate-link', [
        RotateProfileSnapshotShareLinkController,
        'handle',
      ])
      .as('profile.snapshots.share_link.rotate')
    router
      .post('/api/me/profile-snapshots/:snapshotId/rotate-link', [
        RotateProfileSnapshotShareLinkController,
        'handle',
      ])
      .as('api.me.profile_snapshots.share_link.rotate')
      .use([middleware.bindHttpTransport('api-compat')])

    // @deprecated - Settings moved to settings controller
    router
      .put('/profile/settings', ({ response, session }: HttpContext) => {
        session.flash('info', 'This feature has been moved to the settings page')
        response.redirect().toRoute('settings.index')
      })
      .as('profile.update_settings')
  })
  .use([middleware.auth(), middleware.requireOrg(), throttle])

router
  .group(() => {
    router
      .get('/users/pending-approvals', [PendingApprovalUsersApiController, 'handle'])
      .as('api.users.pending_approvals.index')
    router
      .get('/users/pending-approvals/count', [PendingApprovalCountApiController, 'handle'])
      .as('api.users.pending_approvals.count.show')
    router
      .get('/talents/search', [TalentsSearchController, 'handle'])
      .as('api.talents.search.index')
    router
      .get('/talent-bookmarks', [RecruiterBookmarksController, 'index'])
      .as('api.talent_bookmarks.index')
    router
      .post('/talent-bookmarks', [RecruiterBookmarksController, 'store'])
      .as('api.talent_bookmarks.store')
    router
      .patch('/talent-bookmarks/:bookmarkId', [RecruiterBookmarksController, 'update'])
      .as('api.talent_bookmarks.update')
    router
      .delete('/talent-bookmarks/:bookmarkId', [RecruiterBookmarksController, 'destroy'])
      .as('api.talent_bookmarks.destroy')
    router
      .get('/recruiter-bookmarks', [RecruiterBookmarksController, 'index'])
      .as('api.recruiter_bookmarks.index')
    router
      .post('/recruiter-bookmarks', [RecruiterBookmarksController, 'store'])
      .as('api.recruiter_bookmarks.store')
    router
      .patch('/recruiter-bookmarks/:bookmarkId', [RecruiterBookmarksController, 'update'])
      .as('api.recruiter_bookmarks.update')
    router
      .delete('/recruiter-bookmarks/:bookmarkId', [RecruiterBookmarksController, 'destroy'])
      .as('api.recruiter_bookmarks.destroy')
  })
  .prefix('/api')
  .use([
    middleware.bindHttpTransport('api-compat'),
    middleware.bindApiAuthContract('session-or-bearer'),
    middleware.auth(),
    middleware.requireOrg(),
    throttle,
  ])

router
  .group(() => {
    router
      .get('/users/pending-approvals', [PendingApprovalUsersApiController, 'handle'])
      .as('api.v1.users.pending_approvals.index')
    router
      .get('/users/pending-approvals/count', [PendingApprovalCountApiController, 'handle'])
      .as('api.v1.users.pending_approvals.count.show')
    router
      .put('/users/:userId/approve', [ApprovePendingMemberController, 'handle'])
      .as('api.v1.users.approvals.store')
    router
      .get('/talents/search', [TalentsSearchController, 'handle'])
      .as('api.v1.talents.search.index')
    router
      .get('/talent-bookmarks', [RecruiterBookmarksController, 'index'])
      .as('api.v1.talent_bookmarks.index')
    router
      .post('/talent-bookmarks', [RecruiterBookmarksController, 'store'])
      .as('api.v1.talent_bookmarks.store')
    router
      .patch('/talent-bookmarks/:bookmarkId', [RecruiterBookmarksController, 'update'])
      .as('api.v1.talent_bookmarks.update')
    router
      .delete('/talent-bookmarks/:bookmarkId', [RecruiterBookmarksController, 'destroy'])
      .as('api.v1.talent_bookmarks.destroy')
    router
      .get('/recruiter-bookmarks', [RecruiterBookmarksController, 'index'])
      .as('api.v1.recruiter_bookmarks.index')
    router
      .post('/recruiter-bookmarks', [RecruiterBookmarksController, 'store'])
      .as('api.v1.recruiter_bookmarks.store')
    router
      .patch('/recruiter-bookmarks/:bookmarkId', [RecruiterBookmarksController, 'update'])
      .as('api.v1.recruiter_bookmarks.update')
    router
      .delete('/recruiter-bookmarks/:bookmarkId', [RecruiterBookmarksController, 'destroy'])
      .as('api.v1.recruiter_bookmarks.destroy')
    router
      .post('/me/profile-snapshots', [PublishProfileSnapshotController, 'handle'])
      .as('api.v1.me.profile_snapshots.store')
    router
      .get('/me/profile-snapshots/current', [GetCurrentProfileSnapshotController, 'handle'])
      .as('api.v1.me.profile_snapshots.current.show')
    router
      .get('/me/profile-snapshots', [GetProfileSnapshotHistoryController, 'handle'])
      .as('api.v1.me.profile_snapshots.index')
    router
      .patch('/me/profile-snapshots/:snapshotId/access', [
        UpdateProfileSnapshotAccessController,
        'handle',
      ])
      .as('api.v1.me.profile_snapshots.access.update')
    router
      .post('/me/profile-snapshots/:snapshotId/rotate-link', [
        RotateProfileSnapshotShareLinkController,
        'handle',
      ])
      .as('api.v1.me.profile_snapshots.share_link.rotate')

    // Invitations
    const AcceptMyInvitationController = () =>
      import('#modules/organizations/invitations/controllers/accept_my_invitation_controller')
    const RejectMyInvitationController = () =>
      import('#modules/organizations/invitations/controllers/reject_my_invitation_controller')

    router
      .put('/me/invitations/:organizationId/accept', [AcceptMyInvitationController, 'handle'])
      .as('api.v1.me.invitations.accept')
    router
      .put('/me/invitations/:organizationId/reject', [RejectMyInvitationController, 'handle'])
      .as('api.v1.me.invitations.reject')
  })
  .prefix('/api/v1')
  .use([
    middleware.bindHttpTransport('api-canonical'),
    middleware.bindApiAuthContract('session-or-bearer'),
    middleware.auth(),
    middleware.requireOrg(),
    throttle,
  ])

router
  .group(() => {
    router
      .get('/talents/search', [TalentsSearchController, 'handle'])
      .as('api.v1.me.organizations.current.talents.search.index')
    router
      .get('/talents/:userId', [TalentDetailController, 'handle'])
      .as('api.v1.me.organizations.current.talents.show')
    router
      .post('/talents/:userId/bookmarks', [RecruiterBookmarksController, 'store'])
      .as('api.v1.me.organizations.current.talents.bookmarks.store')
    router
      .delete('/talents/:userId/bookmarks', [RecruiterBookmarksController, 'destroyByTalent'])
      .as('api.v1.me.organizations.current.talents.bookmarks.destroy')
  })
  .prefix('/api/v1/me/organizations/current')
  .use([
    middleware.bindHttpTransport('api-canonical'),
    middleware.bindApiAuthContract('session-or-bearer'),
    middleware.auth(),
    middleware.requireOrg(),
    throttle,
  ])

// Public snapshot route (no auth required)
router
  .get('/profiles/:slug', [GetPublicProfileSnapshotController, 'handle'])
  .as('profile.snapshot.public')
