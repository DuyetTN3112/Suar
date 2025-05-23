import router from '@adonisjs/core/services/router'
import { middleware } from '../kernel.js'

// Organization controllers
const OrganizationsController = () => import('#controllers/organizations/organizations_controller')
const SwitchOrganizationController = () =>
  import('#controllers/organizations/switch_organization_controller')
const MembersController = () => import('#controllers/organizations/members_controller')

// CRUD cơ bản cho tổ chức
router
  .group(() => {
    router.get('/organizations', [OrganizationsController, 'index']).as('organizations.index')
    router
      .get('/organizations/create', [OrganizationsController, 'create'])
      .as('organizations.create')
    router.post('/organizations', [OrganizationsController, 'store']).as('organizations.store')
    router.get('/organizations/:id', [OrganizationsController, 'show']).as('organizations.show')
    router
      .get('/organizations/:id/edit', [OrganizationsController, 'edit'])
      .as('organizations.edit')
    router.put('/organizations/:id', [OrganizationsController, 'update']).as('organizations.update')
    router
      .delete('/organizations/:id', [OrganizationsController, 'destroy'])
      .as('organizations.destroy')
  })
  .use(middleware.auth())

// API chuyển tổ chức
router
  .post('/switch-organization', [SwitchOrganizationController, 'handle'])
  .as('organizations.switch')
  .use(middleware.auth())

// Thêm route GET để xử lý redirect sau khi chuyển tổ chức
router
  .get('/organizations/switch/:id', [OrganizationsController, 'switchAndRedirect'])
  .as('organizations.switch.redirect')
  .use(middleware.auth())

// Quản lý thành viên tổ chức
router
  .get('/organizations/users/:id/edit-permissions', [MembersController, 'editPermissions'])
  .as('organizations.members.edit-permissions')
  .use(middleware.auth())

// Hỗ trợ cả POST và PUT cho cập nhật quyền
router
  .post('/organizations/users/:id/update-permissions', [MembersController, 'updatePermissions'])
  .as('organizations.members.update-permissions')
  .use(middleware.auth())

router
  .put('/organizations/users/:id/update-permissions', [MembersController, 'updatePermissions'])
  .as('organizations.members.update-permissions.put')
  .use(middleware.auth())

router
  .delete('/organizations/users/:id/remove', [MembersController, 'removeMember'])
  .as('organizations.members.remove')
  .use(middleware.auth())
