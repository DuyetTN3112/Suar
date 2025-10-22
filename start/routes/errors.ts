import router from '@adonisjs/core/services/router'

const ErrorController = () => import('#modules/errors/controllers/error_controller')
import { resolveLandingPath } from '#modules/auth/public_contracts/landing_surface'
import { organizationPublicApi } from '#modules/organizations/public_contracts/organization_public_api'

/**
 * Routes cho các trang lỗi hoặc thông báo
 */
router.get('/errors/not-found', [ErrorController, 'notFound'])
router.get('/errors/server-error', [ErrorController, 'serverError'])
router.get('/errors/forbidden', [ErrorController, 'forbidden'])
router.get('/errors/require-organization', [ErrorController, 'requireOrganization'])

// ─── Root path redirect ───
// Phải đặt ở đây (cùng file với catch-all) vì ES import hoisting
// sẽ khiến file này được execute trước các route trong index.ts
router.get('/', async ({ auth, response, session }) => {
  try {
    const isLoggedIn = await auth.check()
    if (!isLoggedIn) {
      response.redirect('/login')
      return
    }
    const sessionOrgId = session.get('current_organization_id') as unknown
    const orgId =
      typeof sessionOrgId === 'string' ? sessionOrgId : auth.user?.current_organization_id
    const membership = auth.user && orgId
      ? await organizationPublicApi.findApprovedMembership(orgId, auth.user.id)
      : null

    response.redirect(
      resolveLandingPath({
        systemRole: auth.user?.system_role,
        currentOrganizationId: orgId,
        currentOrganizationRole: membership?.role ?? null,
      })
    )
    return
  } catch {
    response.redirect('/login')
    return
  }
})
