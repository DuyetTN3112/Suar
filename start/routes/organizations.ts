import router from '@adonisjs/core/services/router'
import { middleware } from '../kernel.js'

// Organization controllers
const OrganizationsController = () => import('#controllers/organizations/organizations_controller')
const SwitchOrganizationController = () => import('#controllers/organizations/switch_organization_controller')

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
