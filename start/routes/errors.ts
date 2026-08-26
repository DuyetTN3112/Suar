import router from '@adonisjs/core/services/router'

import { middleware } from '../kernel.js'

const ErrorController = () => import('#modules/errors/controllers/error-handling/error_controller')
const AuthLandingController = () => import('#modules/auth/controllers/session-management/auth_landing_controller')

/**
 * Routes cho các trang lỗi hoặc thông báo
 */
router
  .group(() => {
    router.get('/errors/not-found', [ErrorController, 'notFound'])
    router.get('/errors/server-error', [ErrorController, 'serverError'])
    router.get('/errors/forbidden', [ErrorController, 'forbidden'])
    router.get('/errors/require-organization', [ErrorController, 'requireOrganization'])
    router.get('/', [AuthLandingController, 'root'])
  })
  .use([middleware.bindHttpTransport('page')])

// ─── Root path redirect ───
// Phải đặt ở đây (cùng file với catch-all) vì ES import hoisting
// sẽ khiến file này được execute trước các route trong index.ts
