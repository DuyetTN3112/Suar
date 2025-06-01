import router from '@adonisjs/core/services/router'

/**
 * Routes cho các trang lỗi hoặc thông báo
 */
router.get('/errors/not-found', '#controllers/errors/error_controller.notFound')
router.get('/errors/server-error', '#controllers/errors/error_controller.serverError')
router.get('/errors/forbidden', '#controllers/errors/error_controller.forbidden')
router.get(
  '/errors/require-organization',
  '#controllers/errors/error_controller.requireOrganization'
)

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
