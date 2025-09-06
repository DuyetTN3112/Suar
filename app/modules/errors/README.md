# errors Backend Module

## Module Path

```text
app/modules/errors
```

## Folder And File Inventory

```text
./ README.md
constants/ error_constants.ts
controllers/ error_controller.ts
infra/repositories/ error_event_repository.ts
public_contracts/ error_constants.ts error_event_repository.ts
```

## Route Evidence

```text
start/routes/errors.ts
```

## Symbol Evidence

| Kind | Symbol | File | Line |
|---|---|---|---:|
| enum | `ErrorCode` | `app/modules/errors/constants/error_constants.ts` | 20 |
| const | `ErrorMessages` | `app/modules/errors/constants/error_constants.ts` | 61 |
| const | `HttpStatus` | `app/modules/errors/constants/error_constants.ts` | 128 |
| interface | `ApiErrorResponse` | `app/modules/errors/constants/error_constants.ts` | 163 |
| function | `createApiError` | `app/modules/errors/constants/error_constants.ts` | 188 |
| class | `ErrorController` | `app/modules/errors/controllers/error_controller.ts` | 3 |

## Import Evidence

### `app/modules/errors/controllers/error_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
```
## Code Snippets

### `start/routes/errors.ts`

```ts
import router from '@adonisjs/core/services/router'

const ErrorController = () => import('#modules/errors/controllers/error_controller')

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

    // 1. Check system_role FIRST - Superadmin/System Admin ALWAYS go to /admin
    if (auth.user?.system_role === 'superadmin' || auth.user?.system_role === 'system_admin') {
      response.redirect('/admin')
      return
    }

    // 2. Regular users - check organization context
    const sessionOrgId = session.get('current_organization_id') as unknown
    const orgId =
      typeof sessionOrgId === 'string' ? sessionOrgId : auth.user?.current_organization_id
    if (orgId) {
      response.redirect('/tasks')
      return
    }

    // 3. No organization - go to org selection
    response.redirect('/organizations')
    return
  } catch {
    response.redirect('/login')
    return
  }
})

```

### `app/modules/errors/controllers/error_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'

export default class ErrorController {
  /**
   * Hiển thị trang 404 Not Found
   */
  async notFound({ inertia }: HttpContext) {
    return inertia.render('errors/not_found', {})
  }

  /**
   * Hiển thị trang yêu cầu tham gia tổ chức
   */
  async requireOrganization({ inertia }: HttpContext) {
    return inertia.render('errors/require_organization', {})
  }

  /**
   * Hiển thị trang lỗi server
   */
  async serverError({ inertia }: HttpContext) {
    return inertia.render('errors/server_error', {})
  }

  /**
   * Hiển thị trang không có quyền truy cập
   */
  async forbidden({ inertia }: HttpContext) {
    return inertia.render('errors/forbidden', {})
  }
}

```

### `app/modules/errors/public_contracts/error_constants.ts`

```ts
export * from '#modules/errors/constants/error_constants'

```
