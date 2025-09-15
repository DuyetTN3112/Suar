# http Backend Module

### Kiến trúc lõi & Phân tích nghiệp vụ
- **Correlation ID**: Middleware `request_context_middleware` tự động gán `requestId` và mirror `X-Correlation-Id` cho mọi request nhằm hỗ trợ truy vết lỗi.
- **API Conventions**: Các route nằm dưới `/api/v1/*` tuân thủ API conventions, trả về lỗi theo định dạng chuẩn Problem Details (RFC 7807) tích hợp context metadata.

## Module Path

```text
app/modules/http
```

## Folder And File Inventory

```text
./ README.md
actions/cache/commands/ clear_cache_key_command.ts flush_cache_command.ts set_cache_value_command.ts
actions/cache/ public_api.ts
actions/cache/queries/ get_cache_value_query.ts
actions/ http_action_context.ts
adapters/ http_execution_context_adapter.ts
api_v1/ response_mappers.ts
constants/ route_constants.ts
controllers/ debug_organization_info_api_controller.ts dev_controller.ts get_me_api_controller.ts get_organization_members_api_controller.ts get_users_in_organization_api_controller.ts health_checks_controller.ts redis_clear_cache_controller.ts redis_flush_cache_controller.ts redis_get_cache_controller.ts redis_list_keys_controller.ts redis_set_cache_controller.ts redis_test_connection_controller.ts
controllers/v1/ show_me_controller.ts
errors/ error_utils.ts
errors/error_utils/ app_error.ts controller_handlers.ts extractors.ts reporting.ts
exceptions/ app_exception.ts business_logic_exception.ts conflict_exception.ts forbidden_exception.ts handler.ts index.ts not_found_exception.ts rate_limit_exception.ts unauthorized_exception.ts validation_exception.ts
health_checks/ application_check.ts
libs/ response_helper.ts
middleware/ api_key_middleware.ts cache_middleware.ts container_bindings_middleware.ts detect_user_locale_middleware.ts inertia_middleware.ts lang_static_middleware.ts request_context_middleware.ts soft_delete_middleware.ts
public_contracts/ route_constants.ts
```

## Route Evidence

```text
start/routes/api.ts
start/routes/api_v1.ts
start/routes/index.ts
```

## Symbol Evidence

| Kind | Symbol | File | Line |
|---|---|---|---:|
| class | `ClearCacheKeyCommand` | `app/modules/http/actions/cache/commands/clear_cache_key_command.ts` | 6 |
| class | `FlushCacheCommand` | `app/modules/http/actions/cache/commands/flush_cache_command.ts` | 4 |
| class | `SetCacheValueCommand` | `app/modules/http/actions/cache/commands/set_cache_value_command.ts` | 12 |
| class | `GetCacheValueQuery` | `app/modules/http/actions/cache/queries/get_cache_value_query.ts` | 7 |
| interface | `HttpActionContext` | `app/modules/http/actions/http_action_context.ts` | 1 |
| interface | `AuthenticatedHttpActionContext` | `app/modules/http/actions/http_action_context.ts` | 8 |
| function | `makeSystemHttpActionContext` | `app/modules/http/actions/http_action_context.ts` | 12 |
| function | `actionContextFromHttp` | `app/modules/http/adapters/http_execution_context_adapter.ts` | 9 |
| function | `optionalActionContextFromHttp` | `app/modules/http/adapters/http_execution_context_adapter.ts` | 23 |
| function | `mapApiV1Pagination` | `app/modules/http/api_v1/response_mappers.ts` | 35 |
| function | `mapApiV1TaskStatusResponse` | `app/modules/http/api_v1/response_mappers.ts` | 44 |
| function | `mapApiV1SettingsResponse` | `app/modules/http/api_v1/response_mappers.ts` | 62 |
| function | `mapApiV1NotificationResponse` | `app/modules/http/api_v1/response_mappers.ts` | 75 |
| function | `mapApiV1MeResponse` | `app/modules/http/api_v1/response_mappers.ts` | 94 |
| const | `AuthRoutes` | `app/modules/http/constants/route_constants.ts` | 14 |
| const | `PageRoutes` | `app/modules/http/constants/route_constants.ts` | 23 |
| const | `ApiRoutes` | `app/modules/http/constants/route_constants.ts` | 67 |
| const | `ErrorRoutes` | `app/modules/http/constants/route_constants.ts` | 89 |
| const | `InertiaPages` | `app/modules/http/constants/route_constants.ts` | 100 |
| class | `DebugOrganizationInfoApiController` | `app/modules/http/controllers/debug_organization_info_api_controller.ts` | 9 |
| class | `DevController` | `app/modules/http/controllers/dev_controller.ts` | 10 |
| class | `GetMeApiController` | `app/modules/http/controllers/get_me_api_controller.ts` | 6 |
| class | `GetOrganizationMembersApiController` | `app/modules/http/controllers/get_organization_members_api_controller.ts` | 8 |
| class | `GetUsersInOrganizationApiController` | `app/modules/http/controllers/get_users_in_organization_api_controller.ts` | 11 |
| class | `HealthChecksController` | `app/modules/http/controllers/health_checks_controller.ts` | 9 |
| class | `RedisClearCacheController` | `app/modules/http/controllers/redis_clear_cache_controller.ts` | 10 |
| class | `RedisFlushCacheController` | `app/modules/http/controllers/redis_flush_cache_controller.ts` | 10 |
| class | `RedisGetCacheController` | `app/modules/http/controllers/redis_get_cache_controller.ts` | 10 |
| class | `RedisListKeysController` | `app/modules/http/controllers/redis_list_keys_controller.ts` | 7 |
| class | `RedisSetCacheController` | `app/modules/http/controllers/redis_set_cache_controller.ts` | 10 |
| class | `RedisTestConnectionController` | `app/modules/http/controllers/redis_test_connection_controller.ts` | 7 |
| class | `ShowMeController` | `app/modules/http/controllers/v1/show_me_controller.ts` | 6 |
| interface | `AppErrorOptions` | `app/modules/http/errors/error_utils/app_error.ts` | 1 |
| class | `AppError` | `app/modules/http/errors/error_utils/app_error.ts` | 9 |
| function | `handleControllerError` | `app/modules/http/errors/error_utils/controller_handlers.ts` | 10 |
| function | `handleApiControllerError` | `app/modules/http/errors/error_utils/controller_handlers.ts` | 27 |
| function | `isError` | `app/modules/http/errors/error_utils/extractors.ts` | 3 |
| function | `isAppError` | `app/modules/http/errors/error_utils/extractors.ts` | 7 |
| function | `getErrorMessage` | `app/modules/http/errors/error_utils/extractors.ts` | 11 |
| function | `getErrorCode` | `app/modules/http/errors/error_utils/extractors.ts` | 30 |
| function | `getErrorStatusCode` | `app/modules/http/errors/error_utils/extractors.ts` | 45 |
| function | `withErrorHandling` | `app/modules/http/errors/error_utils/reporting.ts` | 5 |
| function | `serializeError` | `app/modules/http/errors/error_utils/reporting.ts` | 15 |
| function | `logError` | `app/modules/http/errors/error_utils/reporting.ts` | 37 |
| interface | `AppExceptionOptions` | `app/modules/http/exceptions/app_exception.ts` | 5 |
| class | `AppException` | `app/modules/http/exceptions/app_exception.ts` | 11 |
| class | `BusinessLogicException` | `app/modules/http/exceptions/business_logic_exception.ts` | 19 |
| class | `ConflictException` | `app/modules/http/exceptions/conflict_exception.ts` | 18 |
| class | `ForbiddenException` | `app/modules/http/exceptions/forbidden_exception.ts` | 19 |
| class | `HttpExceptionHandler` | `app/modules/http/exceptions/handler.ts` | 61 |
| class | `NotFoundException` | `app/modules/http/exceptions/not_found_exception.ts` | 17 |
| class | `RateLimitException` | `app/modules/http/exceptions/rate_limit_exception.ts` | 18 |
| class | `UnauthorizedException` | `app/modules/http/exceptions/unauthorized_exception.ts` | 18 |
| class | `ValidationException` | `app/modules/http/exceptions/validation_exception.ts` | 18 |
| class | `ApplicationCheck` | `app/modules/http/health_checks/application_check.ts` | 12 |
| interface | `SuccessResponseOptions` | `app/modules/http/libs/response_helper.ts` | 45 |
| interface | `ErrorResponseOptions` | `app/modules/http/libs/response_helper.ts` | 63 |
| interface | `DataResponseOptions` | `app/modules/http/libs/response_helper.ts` | 83 |
| function | `isJsonRequest` | `app/modules/http/libs/response_helper.ts` | 97 |
| function | `isInertiaRequest` | `app/modules/http/libs/response_helper.ts` | 109 |
| function | `respondWithSuccess` | `app/modules/http/libs/response_helper.ts` | 119 |
| function | `respondWithError` | `app/modules/http/libs/response_helper.ts` | 155 |
| function | `respondWithCreated` | `app/modules/http/libs/response_helper.ts` | 235 |
| function | `respondWithDeleted` | `app/modules/http/libs/response_helper.ts` | 245 |
| class | `ApiKeyMiddleware` | `app/modules/http/middleware/api_key_middleware.ts` | 17 |
| class | `CacheMiddleware` | `app/modules/http/middleware/cache_middleware.ts` | 18 |
| class | `ContainerBindingsMiddleware` | `app/modules/http/middleware/container_bindings_middleware.ts` | 10 |
| class | `DetectUserLocaleMiddleware` | `app/modules/http/middleware/detect_user_locale_middleware.ts` | 26 |
| interface | `HttpContext` | `app/modules/http/middleware/detect_user_locale_middleware.ts` | 135 |
| class | `InertiaMiddleware` | `app/modules/http/middleware/inertia_middleware.ts` | 38 |
| class | `LangStaticMiddleware` | `app/modules/http/middleware/lang_static_middleware.ts` | 16 |
| class | `RequestContextMiddleware` | `app/modules/http/middleware/request_context_middleware.ts` | 11 |
| interface | `HttpContext` | `app/modules/http/middleware/request_context_middleware.ts` | 33 |
| class | `SoftDeleteMiddleware` | `app/modules/http/middleware/soft_delete_middleware.ts` | 21 |

## Import Evidence

### `app/modules/http/actions/cache/commands/clear_cache_key_command.ts`

```ts
import { cacheStore } from '#modules/cache/public_contracts/cache_store'
import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import type { HttpActionContext } from '#modules/http/actions/http_action_context'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
```

### `app/modules/http/actions/cache/commands/flush_cache_command.ts`

```ts
import { cacheStore } from '#modules/cache/public_contracts/cache_store'
import type { HttpActionContext } from '#modules/http/actions/http_action_context'
```

### `app/modules/http/actions/cache/commands/set_cache_value_command.ts`

```ts
import { cacheStore } from '#modules/cache/public_contracts/cache_store'
import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import type { HttpActionContext } from '#modules/http/actions/http_action_context'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
```

### `app/modules/http/actions/cache/public_api.ts`

```ts
// no imports
```

### `app/modules/http/actions/cache/queries/get_cache_value_query.ts`

```ts
import { cacheStore } from '#modules/cache/public_contracts/cache_store'
import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import type { HttpActionContext } from '#modules/http/actions/http_action_context'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import NotFoundException from '#modules/http/exceptions/not_found_exception'
```

### `app/modules/http/actions/http_action_context.ts`

```ts
// no imports
```

### `app/modules/http/controllers/debug_organization_info_api_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import { organizationPublicApi } from '#modules/organizations/public_contracts/organization_public_api'
```

### `app/modules/http/controllers/dev_controller.ts`

```ts
import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import type { HttpContext } from '@adonisjs/core/http'
import ForbiddenException from '#modules/http/exceptions/forbidden_exception'
```

### `app/modules/http/controllers/get_me_api_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
```

### `app/modules/http/controllers/get_organization_members_api_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { organizationPublicApi } from '#modules/organizations/public_contracts/organization_public_api'
```

### `app/modules/http/controllers/get_users_in_organization_api_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import { organizationPublicApi } from '#modules/organizations/public_contracts/organization_public_api'
```

### `app/modules/http/controllers/health_checks_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import env from '#start/env'
import { healthChecks } from '#start/health'
```

### `app/modules/http/controllers/redis_clear_cache_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { ClearCacheKeyCommand } from '#modules/http/actions/cache/public_api'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
```

### `app/modules/http/controllers/redis_flush_cache_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { FlushCacheCommand } from '#modules/http/actions/cache/public_api'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
```

### `app/modules/http/controllers/redis_get_cache_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { GetCacheValueQuery } from '#modules/http/actions/cache/public_api'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
```

### `app/modules/http/controllers/redis_list_keys_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import Redis from '@adonisjs/redis/services/main'
```

### `app/modules/http/controllers/redis_set_cache_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { SetCacheValueCommand } from '#modules/http/actions/cache/public_api'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
```

### `app/modules/http/controllers/redis_test_connection_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import Redis from '@adonisjs/redis/services/main'
```

### `app/modules/http/controllers/v1/show_me_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { mapApiV1MeResponse } from '#modules/http/api_v1/response_mappers'
import { OrganizationUserStatus } from '#modules/organizations/public_contracts/organization_constants'
```
## Code Snippets

### `app/modules/http/actions/cache/commands/clear_cache_key_command.ts`

```ts
import { cacheStore } from '#modules/cache/public_contracts/cache_store'
import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import type { HttpActionContext } from '#modules/http/actions/http_action_context'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'

export default class ClearCacheKeyCommand {
  constructor(protected execCtx: HttpActionContext) {}

  async execute(key: string): Promise<void> {
    void this.execCtx

    if (!key) {
      throw new BusinessLogicException(ErrorMessages.INVALID_INPUT)
    }

    await cacheStore.delete(key)
  }
}

```

### `app/modules/http/actions/cache/commands/flush_cache_command.ts`

```ts
import { cacheStore } from '#modules/cache/public_contracts/cache_store'
import type { HttpActionContext } from '#modules/http/actions/http_action_context'

export default class FlushCacheCommand {
  constructor(protected execCtx: HttpActionContext) {}

  async execute(): Promise<void> {
    void this.execCtx
    await cacheStore.flush()
  }
}

```

### `app/modules/http/actions/cache/commands/set_cache_value_command.ts`

```ts
import { cacheStore } from '#modules/cache/public_contracts/cache_store'
import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import type { HttpActionContext } from '#modules/http/actions/http_action_context'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'

interface SetCacheValueDTO {
  key: string
  value: unknown
  ttl: number
}

export default class SetCacheValueCommand {
  constructor(protected execCtx: HttpActionContext) {}

  async execute(dto: SetCacheValueDTO): Promise<void> {
    void this.execCtx

    if (!dto.key || dto.value === undefined) {
      throw new BusinessLogicException(ErrorMessages.INVALID_INPUT)
    }

    await cacheStore.set(dto.key, dto.value, dto.ttl)
  }
}

```

### `app/modules/http/actions/cache/queries/get_cache_value_query.ts`

```ts
import { cacheStore } from '#modules/cache/public_contracts/cache_store'
import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import type { HttpActionContext } from '#modules/http/actions/http_action_context'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import NotFoundException from '#modules/http/exceptions/not_found_exception'

export default class GetCacheValueQuery {
  constructor(protected execCtx: HttpActionContext) {}

  async execute(key: string): Promise<unknown> {
    void this.execCtx

    if (!key) {
      throw new BusinessLogicException(ErrorMessages.INVALID_INPUT)
    }

    const value = await cacheStore.get(key)
    if (value === null) {
      throw new NotFoundException(ErrorMessages.NOT_FOUND)
    }

    return value
  }
}

```

### `app/modules/http/controllers/debug_organization_info_api_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'

import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import { organizationPublicApi } from '#modules/organizations/public_contracts/organization_public_api'

/**
 * GET /api/debug-organization-info → Debug organization info (DEV ONLY)
 */
export default class DebugOrganizationInfoApiController {
  async handle({ auth, session, response }: HttpContext) {
    const user = auth.user
    if (!user) {
      throw new UnauthorizedException()
    }

    const sessionOrgId = session.get('current_organization_id') as string | undefined
    const debug = await organizationPublicApi.getDebugOrganizationInfo(user.id, sessionOrgId)

    response.json({ success: true, debug })
  }
}

```

### `app/modules/http/controllers/dev_controller.ts`

```ts
import { exec } from 'node:child_process'
import { promisify } from 'node:util'

import type { HttpContext } from '@adonisjs/core/http'

import ForbiddenException from '#modules/http/exceptions/forbidden_exception'

const execAsync = promisify(exec)

export default class DevController {
  /**
   * Endpoint để khởi động lại dev server
   * Chỉ có tác dụng trong môi trường development
   */
  restart({ response, logger }: HttpContext) {
    // Kiểm tra môi trường
    if (process.env.NODE_ENV !== 'development') {
      throw new ForbiddenException('Chỉ có thể khởi động lại server trong môi trường development')
    }

    logger.info('Đang khởi động lại dev server...')

    // Lưu process ID để restart
    const pid = process.pid
    logger.info(`Process ID: ${String(pid)}`)

    // Thực hiện restart sau 1 giây
    setTimeout(() => {
      void (async () => {
        try {
          // Thực hiện restart dựa trên OS
          if (process.platform === 'win32') {
            // Windows
            await execAsync(`taskkill /F /PID ${String(pid)} & npm run dev`)
          } else {
            // Linux/Mac
            await execAsync(`kill -9 ${String(pid)} && npm run dev &`)
          }
        } catch (error) {
          logger.error('Lỗi khi khởi động lại server:', error)
        }
      })()
    }, 1000)

    response.json({
      success: true,
      message: 'Đang khởi động lại dev server...',
    })
  }
}

```

### `app/modules/http/controllers/get_me_api_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'

/**
 * GET /api/me → Get current authenticated user
 */
export default class GetMeApiController {
  async handle({ auth }: HttpContext) {
    await auth.check()
    return auth.user
  }
}

```

### `app/modules/http/controllers/get_organization_members_api_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'

import { organizationPublicApi } from '#modules/organizations/public_contracts/organization_public_api'

/**
 * GET /api/organization-members/:id → Get organization members
 */
export default class GetOrganizationMembersApiController {
  async handle(ctx: HttpContext) {
    const { params, response } = ctx
    const result = await organizationPublicApi.getOrganizationMembersApi(params.id as string)

    response.json({
      success: true,
      organization: result.organization,
      members: result.members,
    })
  }
}

```

### `app/modules/http/controllers/get_users_in_organization_api_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'

import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import { organizationPublicApi } from '#modules/organizations/public_contracts/organization_public_api'

/**
 * GET /api/users-in-organization → Get users in current organization
 */
export default class GetUsersInOrganizationApiController {
  async handle(ctx: HttpContext) {
    const { auth, response, session } = ctx

    if (!auth.user) {
      throw new UnauthorizedException()
    }

    const userOrgId = auth.user.current_organization_id
    const sessionOrgId = session.get('current_organization_id') as string | undefined
    const organizationId = userOrgId ?? sessionOrgId

    if (!organizationId) {
      throw new BusinessLogicException(ErrorMessages.REQUIRE_ORGANIZATION)
    }

    const formattedUsers = await organizationPublicApi.getUsersInOrganization(
      organizationId,
      auth.user.id
    )

    response.json({ success: true, users: formattedUsers })
  }
}

```

### `app/modules/http/controllers/health_checks_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'

import env from '#start/env'
import { healthChecks } from '#start/health'

/**
 * Controller xử lý các health checks.
 */
export default class HealthChecksController {
  /**
   * Xử lý yêu cầu health check và trả về báo cáo.
   */
  async handle({ response }: HttpContext) {
    const startTime = Date.now()

    const report = await healthChecks.run()
    const environment = {
      environment: env.get('NODE_ENV', 'production'),
      serverTime: new Date().toISOString(),
      executionTime: `${Date.now() - startTime}ms`,
    }
    const fullReport = {
      ...report,
      environment,
    }

    if (report.isHealthy) {
      response.ok(fullReport)
      return
    }
    response.serviceUnavailable(fullReport)
  }
}

```
