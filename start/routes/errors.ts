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

// Fallback route cho 404
router.any('*', ({ response }) => {
  return response.redirect('/errors/not-found')
})
