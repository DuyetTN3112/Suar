import router from '@adonisjs/core/services/router'
import { middleware } from '../kernel.js'

// Organization controllers
const OrganizationsController = () => import('#controllers/organizations/organizations_controller')
// const SwitchOrganizationController = () =>
//   import('#controllers/organizations/switch_organization_controller')
const MembersController = () => import('#controllers/organizations/members_controller')

// Route hiển thị tất cả tổ chức (không phụ thuộc vào người dùng)
router
  .get('/all-organizations', [OrganizationsController, 'allOrganizations'])
  .as('organizations.all')
  .use(middleware.auth()) // Vẫn yêu cầu đăng nhập nhưng không kiểm tra tổ chức

// API endpoint để lấy danh sách tổ chức

router
  .get('/api/organizations', [OrganizationsController, 'apiListOrganizations'])
  .as('api.organizations.list')
  .use(middleware.auth())

// Route debug tổ chức - phải đặt trước các route khác
router
  .get('/organizations/debug', async ({ inertia }) => {
    return inertia.render('organizations/organization-debug')
  })
  .as('organizations.debug')
  .use(middleware.auth())

// Route tham gia tổ chức

router
  .get('/organizations/:id/join', [OrganizationsController, 'join'])
  .as('organizations.join')
  .use(middleware.auth())

// Route POST tham gia tổ chức (cho phép tham gia từ API)

router
  .post('/organizations/:id/join', [OrganizationsController, 'join'])
  .as('organizations.join.post')
  .use(middleware.auth())

// Nhóm route cho tổ chức
router
  .group(() => {
    // Danh sách tổ chức

    router.get('/', [OrganizationsController, 'index']).as('organizations.index')
    // Tạo tổ chức mới

    router.get('/create', [OrganizationsController, 'create']).as('organizations.create')

    router.post('/', [OrganizationsController, 'store']).as('organizations.store')
    // Chi tiết và cập nhật tổ chức

    router.get('/:id', [OrganizationsController, 'show']).as('organizations.show')

    router.get('/:id/edit', [OrganizationsController, 'edit']).as('organizations.edit')

    router.post('/:id', [OrganizationsController, 'update']).as('organizations.update')
    // Xóa tổ chức

    router.delete('/:id', [OrganizationsController, 'destroy']).as('organizations.destroy')
    // Chuyển đổi tổ chức hiện tại

    router
      .post('/:id/switch', [OrganizationsController, 'switchOrganization'])
      .as('organizations.switch')

    // Quản lý thành viên tổ chức
    router
      .group(() => {
        // Hiển thị danh sách thành viên

        router.get('/', [MembersController, 'index']).as('organizations.members.index')
        // Hiển thị yêu cầu tham gia đang chờ

        router
          .get('/pending', [MembersController, 'pendingRequests'])
          .as('organizations.members.pending_requests')
        // Thêm thành viên mới

        router.post('/add', [MembersController, 'add']).as('organizations.members.add')
        // Mời người dùng vào tổ chức

        router.post('/invite', [MembersController, 'invite']).as('organizations.members.invite')
        // Thêm người dùng trực tiếp (cho admin)

        router
          .post('/add-direct', [MembersController, 'addDirect'])
          .as('organizations.members.add_direct')
        // Xử lý yêu cầu tham gia

        router
          .post('/process-request/:userId', [MembersController, 'processRequest'])
          .as('organizations.members.process_request')
        // Cập nhật vai trò thành viên

        router
          .post('/update-role/:userId', [MembersController, 'updateRole'])
          .as('organizations.members.update_role')
        // Xóa thành viên

        router.delete('/:userId', [MembersController, 'remove']).as('organizations.members.remove')
      })
      .prefix('/:id/members')
  })
  .prefix('/organizations')

// API chuyển tổ chức
router
  .post('/switch-organization', '#controllers/organizations/switch_organization_controller.handle')
  .as('organizations.switch.api')
  .use(middleware.auth())

// Thêm route GET để xử lý redirect sau khi chuyển tổ chức
router
  .get(
    '/organizations/switch/:id',
    '#controllers/organizations/organizations_controller.switchAndRedirect'
  )
  .as('organizations.switch.redirect')
  .use(middleware.auth())

// Quản lý thành viên tổ chức
router
  .get(
    '/organizations/users/:id/edit-permissions',
    '#controllers/organizations/members_controller.editPermissions'
  )
  .as('organizations.members.edit-permissions')
  .use(middleware.auth())

// Hỗ trợ cả POST và PUT cho cập nhật quyền
router
  .post(
    '/organizations/users/:id/update-permissions',
    '#controllers/organizations/members_controller.updatePermissions'
  )
  .as('organizations.members.update-permissions')
  .use(middleware.auth())

router
  .put(
    '/organizations/users/:id/update-permissions',
    '#controllers/organizations/members_controller.updatePermissions'
  )
  .as('organizations.members.update-permissions.put')
  .use(middleware.auth())

router
  .delete(
    '/organizations/users/:id/remove',
    '#controllers/organizations/members_controller.removeMember'
  )
  .as('organizations.users.remove')
  .use(middleware.auth())

router
  .post('/organizations/users/add', '#controllers/organizations/members_controller.addUsers')
  .as('organizations.users.add')
  .use(middleware.auth())
