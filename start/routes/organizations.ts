import router from '@adonisjs/core/services/router'

import { middleware } from '../kernel.js'

import { throttle } from '#start/limiter'

/**
 * Organization Discovery Routes
 *
 * Prefix: /organizations
 * Purpose: Public organization directory — list, join, create, switch.
 *
 * ⚠️ Member management (members, roles, permissions, departments,
 * projects, tasks, workflow) is at /org (org admin surface).
 *
 * Middleware: auth + throttle (no org context required).
 */

// Organization discovery controllers
const ListOrganizationsController = () =>
  import('#modules/organizations/directory/controllers/list_organizations_controller')
const ShowOrganizationController = () =>
  import('#modules/organizations/directory/controllers/show_organization_controller')
const CreateOrganizationController = () =>
  import('#modules/organizations/directory/controllers/create_organization_controller')
const SwitchAndRedirectController = () =>
  import('#modules/organizations/access/controllers/switch_and_redirect_controller')
const AllOrganizationsController = () =>
  import('#modules/organizations/directory/controllers/all_organizations_controller')
const JoinOrganizationController = () =>
  import('#modules/organizations/invitations/controllers/join_organization_controller')
const ApiListOrganizationsController = () =>
  import('#modules/organizations/directory/controllers/api_list_organizations_controller')

// ─── Public Organization Directory ────────────────────────────────

// List all organizations (discovery)
router
  .get('/all-organizations', [AllOrganizationsController, 'handle'])
  .as('organizations.directory.index')
  .use(middleware.auth())

// API: list organizations (for dropdowns, search)
router
  .get('/api/organizations', [ApiListOrganizationsController, 'handle'])
  .as('api.organizations.index')
  .use([
    middleware.bindHttpTransport('api-compat'),
    middleware.bindApiAuthContract('session-or-bearer'),
    middleware.auth(),
  ])
router
  .get('/api/v1/organizations', [ApiListOrganizationsController, 'handle'])
  .as('api.v1.organizations.index')
  .use([
    middleware.bindHttpTransport('api-canonical'),
    middleware.bindApiAuthContract('bearer-or-session'),
    middleware.auth(),
  ])

// Join organization
router
  .get('/organizations/:organizationId/join', [JoinOrganizationController, 'handle'])
  .as('organizations.join')
  .use(middleware.auth())
router
  .post('/organizations/:organizationId/join', [JoinOrganizationController, 'handle'])
  .as('organizations.join.post')
  .use(middleware.auth())

// ─── Organization Scoped Routes ───────────────────────────────────
router
  .group(() => {
    // List user's organizations
    router.get('/', [ListOrganizationsController, 'handle']).as('organizations.index')

    // Create new organization
    router.get('/create', [CreateOrganizationController, 'showForm']).as('organizations.create')
    router.post('/', [CreateOrganizationController, 'handle']).as('organizations.store')

    // Organization detail
    router.get('/:organizationId', [ShowOrganizationController, 'handle']).as('organizations.show')

    // Switch to organization
    router
      .post('/:organizationId/switch', [SwitchAndRedirectController, 'switchOrganization'])
      .as('organizations.switch')
  })
  .prefix('/organizations')
  .use([middleware.auth(), throttle])

// Redirect after switch
router
  .get('/organizations/switch/:organizationId', [SwitchAndRedirectController, 'handle'])
  .as('organizations.switch.redirect')
  .use(middleware.auth())

// Switch organization API (for sidebar)
const SwitchOrgApiController = () =>
  import('#modules/organizations/access/controllers/switch_organization_controller')

router
  .post('/switch-organization', [SwitchOrgApiController, 'handle'])
  .as('organizations.context_switch.store')
  .use([
    middleware.bindHttpTransport('api-compat'),
    middleware.bindApiAuthContract('session-or-bearer'),
    middleware.auth(),
  ])
router
  .post('/api/v1/me/organizations/switch', [SwitchOrgApiController, 'handle'])
  .as('api.v1.me.organizations.switch.store')
  .use([
    middleware.bindHttpTransport('api-canonical'),
    middleware.bindApiAuthContract('bearer-or-session'),
    middleware.auth(),
  ])
