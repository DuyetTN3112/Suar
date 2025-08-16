import router from '@adonisjs/core/services/router'

import { middleware } from '../kernel.js'

import { throttle } from '#start/limiter'

// Organization use-case controllers
const ListOrganizationsController = () =>
  import('#modules/organizations/controllers/list_organizations_controller')
const ShowOrganizationController = () =>
  import('#modules/organizations/controllers/show_organization_controller')
const CreateOrganizationController = () =>
  import('#modules/organizations/controllers/create_organization_controller')
const SwitchAndRedirectController = () =>
  import('#modules/organizations/controllers/switch_and_redirect_controller')
const AllOrganizationsController = () =>
  import('#modules/organizations/controllers/all_organizations_controller')
const JoinOrganizationController = () =>
  import('#modules/organizations/controllers/join_organization_controller')
const ApiListOrganizationsController = () =>
  import('#modules/organizations/controllers/api_list_organizations_controller')
const ListMembersController = () =>
  import('#modules/organizations/controllers/list_members_controller')
const PendingRequestsController = () =>
  import('#modules/organizations/controllers/pending_requests_controller')
const AddMemberController = () => import('#modules/organizations/controllers/add_member_controller')
const InviteMemberController = () =>
  import('#modules/organizations/controllers/invite_member_controller')
const ProcessJoinRequestController = () =>
  import('#modules/organizations/controllers/process_join_request_controller')
const AddDirectMemberController = () =>
  import('#modules/organizations/controllers/add_direct_member_controller')
const RemoveMemberController = () =>
  import('#modules/organizations/controllers/remove_member_controller')
const UpdateMemberRoleController = () =>
  import('#modules/organizations/controllers/update_member_role_controller')
const AddUsersController = () => import('#modules/organizations/controllers/add_users_controller')

// Route hiển thị tất cả tổ chức (không phụ thuộc vào người dùng)
router
  .get('/all-organizations', [AllOrganizationsController, 'handle'])
  .as('organizations.all')
  .use(middleware.auth())

// API endpoint để lấy danh sách tổ chức
router
  .get('/api/organizations', [ApiListOrganizationsController, 'handle'])
  .as('api.organizations.list')
  .use(middleware.auth())

// Route debug tổ chức - phải đặt trước các route khác
router
  .get('/organizations/debug', async ({ inertia }) => {
    return inertia.render('organizations/organization-debug', {})
  })
  .as('organizations.debug')
  .use(middleware.auth())

// Route tham gia tổ chức
router
  .get('/organizations/:id/join', [JoinOrganizationController, 'handle'])
  .as('organizations.join')
  .use(middleware.auth())

// Route POST tham gia tổ chức (cho phép tham gia từ API)
router
  .post('/organizations/:id/join', [JoinOrganizationController, 'handle'])
  .as('organizations.join.post')
  .use(middleware.auth())

// Nhóm route cho tổ chức
router
  .group(() => {
    // Danh sách tổ chức
    router.get('/', [ListOrganizationsController, 'handle']).as('organizations.index')
    // Tạo tổ chức mới
    router.get('/create', [CreateOrganizationController, 'showForm']).as('organizations.create')

    router.post('/', [CreateOrganizationController, 'handle']).as('organizations.store')
    // Chi tiết tổ chức
    router.get('/:id', [ShowOrganizationController, 'handle']).as('organizations.show')

    // TODO: Implement edit, update, destroy methods
    // router.get('/:id/edit', [EditOrganizationController, 'showForm']).as('organizations.edit')
    // router.post('/:id', [EditOrganizationController, 'handle']).as('organizations.update')
    // router.delete('/:id', [DeleteOrganizationController, 'handle']).as('organizations.destroy')

    // Chuyển đổi tổ chức hiện tại
    router
      .post('/:id/switch', [SwitchAndRedirectController, 'switchOrganization'])
      .as('organizations.switch')

    // Quản lý thành viên tổ chức — use-case controllers
    router
      .group(() => {
        // Hiển thị danh sách thành viên
        router.get('/', [ListMembersController, 'handle']).as('organizations.members.index')
        // Hiển thị yêu cầu tham gia đang chờ
        router
          .get('/pending', [PendingRequestsController, 'handle'])
          .as('organizations.members.pending_requests')
        // Thêm thành viên mới
        router.post('/add', [AddMemberController, 'handle']).as('organizations.members.add')
        // Mời người dùng vào tổ chức
        router
          .post('/invite', [InviteMemberController, 'handle'])
          .as('organizations.members.invite')
        // Thêm người dùng trực tiếp (cho admin)
        router
          .post('/add-direct', [AddDirectMemberController, 'handle'])
          .as('organizations.members.add_direct')
        // Xử lý yêu cầu tham gia
        router
          .post('/process-request/:userId', [ProcessJoinRequestController, 'handle'])
          .as('organizations.members.process_request')
        // Cập nhật vai trò thành viên
        router
          .post('/update-role/:userId', [UpdateMemberRoleController, 'handle'])
          .as('organizations.members.update_role')
        // Xóa thành viên
        router
          .delete('/:userId', [RemoveMemberController, 'handle'])
          .as('organizations.members.remove')
      })
      .prefix('/:id/members')
  })
  .prefix('/organizations')
  .use([middleware.auth(), throttle])

const SwitchOrganizationController = () =>
  import('#modules/organizations/controllers/switch_organization_controller')

// API chuyển tổ chức
router
  .post('/switch-organization', [SwitchOrganizationController, 'handle'])
  .as('organizations.switch.api')
  .use(middleware.auth())

// Thêm route GET để xử lý redirect sau khi chuyển tổ chức
router
  .get('/organizations/switch/:id', [SwitchAndRedirectController, 'handle'])
  .as('organizations.switch.redirect')
  .use(middleware.auth())

// Quản lý thành viên tổ chức (standalone routes)
router
  .delete('/organizations/users/:id/remove', [RemoveMemberController, 'handle'])
  .as('organizations.users.remove')
  .use(middleware.auth())

// TODO: editPermissions and updatePermissions routes — not yet implemented
// Uncomment when EditPermissionsController and UpdatePermissionsController are created
// router.get('/organizations/users/:id/edit-permissions', [EditPermissionsController, 'handle'])
// router.post('/organizations/users/:id/update-permissions', [UpdatePermissionsController, 'handle'])
// router.put('/organizations/users/:id/update-permissions', [UpdatePermissionsController, 'handle'])

router
  .post('/organizations/users/add', [AddUsersController, 'handle'])
  .as('organizations.users.add')
  .use(middleware.auth())
