import router from '@adonisjs/core/services/router'

const ErrorController = () => import('#controllers/errors/error_controller')

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
    await auth.check()
    const orgId = session.get('current_organization_id') ?? auth.user?.current_organization_id
    if (orgId) {
      response.redirect('/tasks')
      return
    }
    response.redirect('/organizations')
    return
  } catch {
    response.redirect('/login')
    return
  }
})
