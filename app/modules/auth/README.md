# auth Backend Module

## Module Path

```text
app/modules/auth
```

## Folder And File Inventory

```text
./ README.md
actions/ auth_action_context.ts base_command.ts base_query.ts interfaces.ts result.ts
actions/commands/ logout_user_command.ts process_social_auth_callback_command.ts social_login_command.ts
actions/dtos/request/ logout_user_dto.ts
actions/support/ social_auth_logging.ts
controllers/ logout_controller.ts social_auth_controller.ts
controllers/mappers/request/ auth_request_mapper.ts social_auth_request_mapper.ts
controllers/mappers/response/ auth_response_mapper.ts social_auth_response_mapper.ts
infra/models/ user_oauth_provider.ts
infra/oauth/ social_auth_provider_service.ts
infra/repositories/ user_oauth_provider_repository.ts
infra/ social_login_persistence_service.ts
middleware/ auth_middleware.ts guest_middleware.ts
validators/ auth.ts
```

## Route Evidence

```text
start/routes/auth.ts
```

## Symbol Evidence

| Kind | Symbol | File | Line |
|---|---|---|---:|
| interface | `AuthActionContext` | `app/modules/auth/actions/auth_action_context.ts` | 1 |
| interface | `AuthenticatedAuthActionContext` | `app/modules/auth/actions/auth_action_context.ts` | 8 |
| function | `makeSystemAuthActionContext` | `app/modules/auth/actions/auth_action_context.ts` | 12 |
| class | `LogoutUserCommand` | `app/modules/auth/actions/commands/logout_user_command.ts` | 8 |
| type | `ProcessSocialAuthCallbackResult` | `app/modules/auth/actions/commands/process_social_auth_callback_command.ts` | 17 |
| class | `ProcessSocialAuthCallbackCommand` | `app/modules/auth/actions/commands/process_social_auth_callback_command.ts` | 19 |
| class | `SocialLoginCommand` | `app/modules/auth/actions/commands/social_login_command.ts` | 35 |
| class | `LogoutUserDTO` | `app/modules/auth/actions/dtos/request/logout_user_dto.ts` | 4 |
| interface | `CommandHandler` | `app/modules/auth/actions/interfaces.ts` | 7 |
| interface | `QueryHandler` | `app/modules/auth/actions/interfaces.ts` | 22 |
| interface | `Command` | `app/modules/auth/actions/interfaces.ts` | 36 |
| interface | `Query` | `app/modules/auth/actions/interfaces.ts` | 43 |
| class | `Result` | `app/modules/auth/actions/result.ts` | 5 |
| function | `logSocialAuthConfigCheck` | `app/modules/auth/actions/support/social_auth_logging.ts` | 3 |
| function | `logSocialAuthRedirect` | `app/modules/auth/actions/support/social_auth_logging.ts` | 12 |
| function | `logSocialAuthCallbackStart` | `app/modules/auth/actions/support/social_auth_logging.ts` | 19 |
| class | `LogoutController` | `app/modules/auth/controllers/logout_controller.ts` | 24 |
| function | `buildLogoutUserDTO` | `app/modules/auth/controllers/mappers/request/auth_request_mapper.ts` | 5 |
| type | `SupportedSocialAuthProvider` | `app/modules/auth/controllers/mappers/request/social_auth_request_mapper.ts` | 6 |
| function | `buildSupportedSocialAuthProvider` | `app/modules/auth/controllers/mappers/request/social_auth_request_mapper.ts` | 10 |
| function | `buildSocialAuthCallbackUrl` | `app/modules/auth/controllers/mappers/request/social_auth_request_mapper.ts` | 19 |
| function | `buildSocialAuthRedirectLogContext` | `app/modules/auth/controllers/mappers/request/social_auth_request_mapper.ts` | 23 |
| function | `buildSocialAuthCallbackLogContext` | `app/modules/auth/controllers/mappers/request/social_auth_request_mapper.ts` | 31 |
| function | `getLogoutRedirectPath` | `app/modules/auth/controllers/mappers/response/auth_response_mapper.ts` | 3 |
| function | `shouldUseInertiaLocation` | `app/modules/auth/controllers/mappers/response/auth_response_mapper.ts` | 7 |
| function | `mapLoggedOutAuthShare` | `app/modules/auth/controllers/mappers/response/auth_response_mapper.ts` | 11 |
| function | `mapSocialAuthErrorRedirect` | `app/modules/auth/controllers/mappers/response/social_auth_response_mapper.ts` | 3 |
| function | `mapSocialAuthSuccessRedirect` | `app/modules/auth/controllers/mappers/response/social_auth_response_mapper.ts` | 12 |
| function | `mapSocialAuthSessionState` | `app/modules/auth/controllers/mappers/response/social_auth_response_mapper.ts` | 18 |
| class | `SocialAuthController` | `app/modules/auth/controllers/social_auth_controller.ts` | 23 |
| class | `UserOAuthProvider` | `app/modules/auth/infra/models/user_oauth_provider.ts` | 4 |
| type | `SupportedSocialAuthProvider` | `app/modules/auth/infra/oauth/social_auth_provider_service.ts` | 5 |
| interface | `SocialAuthDriver` | `app/modules/auth/infra/oauth/social_auth_provider_service.ts` | 7 |
| interface | `SocialAuthFailureResult` | `app/modules/auth/infra/oauth/social_auth_provider_service.ts` | 15 |
| interface | `NormalizedSocialAuthUser` | `app/modules/auth/infra/oauth/social_auth_provider_service.ts` | 20 |
| interface | `SocialAuthSuccessResult` | `app/modules/auth/infra/oauth/social_auth_provider_service.ts` | 29 |
| type | `ReadSocialAuthCallbackResult` | `app/modules/auth/infra/oauth/social_auth_provider_service.ts` | 34 |
| class | `SocialAuthProviderService` | `app/modules/auth/infra/oauth/social_auth_provider_service.ts` | 48 |
| class | `UserOAuthProviderRepository` | `app/modules/auth/infra/repositories/user_oauth_provider_repository.ts` | 5 |
| type | `SupportedProvider` | `app/modules/auth/infra/social_login_persistence_service.ts` | 8 |
| type | `SocialAuthenticatedUser` | `app/modules/auth/infra/social_login_persistence_service.ts` | 9 |
| interface | `SocialLoginInput` | `app/modules/auth/infra/social_login_persistence_service.ts` | 13 |
| class | `SocialLoginPersistenceService` | `app/modules/auth/infra/social_login_persistence_service.ts` | 33 |
| class | `AuthMiddleware` | `app/modules/auth/middleware/auth_middleware.ts` | 27 |
| class | `GuestMiddleware` | `app/modules/auth/middleware/guest_middleware.ts` | 11 |
| const | `emailRule` | `app/modules/auth/validators/auth.ts` | 6 |

## Import Evidence

### `app/modules/auth/actions/auth_action_context.ts`

```ts
// no imports
```

### `app/modules/auth/actions/base_command.ts`

```ts
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { CommandHandler } from './interfaces.js'
import { Result } from './result.js'
import type { AuthActionContext } from '#modules/auth/actions/auth_action_context'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
```

### `app/modules/auth/actions/base_query.ts`

```ts
import type { QueryHandler } from './interfaces.js'
import { Result } from './result.js'
import type { AuthActionContext } from '#modules/auth/actions/auth_action_context'
import { cacheStore } from '#modules/cache/public_contracts/cache_store'
```

### `app/modules/auth/actions/commands/logout_user_command.ts`

```ts
import emitter from '@adonisjs/core/services/emitter'
import { BaseCommand } from '../base_command.js'
import type { LogoutUserDTO } from '../dtos/request/logout_user_dto.js'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
```

### `app/modules/auth/actions/commands/process_social_auth_callback_command.ts`

```ts
import SocialLoginCommand from './social_login_command.js'
import SocialAuthProviderService, {
  type SocialAuthDriver,
  type SocialAuthFailureResult,
  type SupportedSocialAuthProvider,
} from '#modules/auth/infra/oauth/social_auth_provider_service'
import type { SocialAuthenticatedUser } from '#modules/auth/infra/social_login_persistence_service'
```

### `app/modules/auth/actions/commands/social_login_command.ts`

```ts
import emitter from '@adonisjs/core/services/emitter'
import db from '@adonisjs/lucid/services/db'
import SocialLoginPersistenceService, {
  type SocialAuthenticatedUser,
  type SocialLoginInput,
  type SupportedProvider,
} from '#modules/auth/infra/social_login_persistence_service'
import { singleFlight } from '#modules/cache/public_contracts/cache_store'
import * as AuthLogger from '#modules/logger/public_contracts/auth_logger'
```

### `app/modules/auth/actions/dtos/request/logout_user_dto.ts`

```ts
import type { Command } from '../../interfaces.js'
import ValidationException from '#modules/http/exceptions/validation_exception'
```

### `app/modules/auth/actions/interfaces.ts`

```ts
// no imports
```

### `app/modules/auth/actions/result.ts`

```ts
// no imports
```

### `app/modules/auth/actions/support/social_auth_logging.ts`

```ts
import * as AuthLogger from '#modules/logger/public_contracts/auth_logger'
```

### `app/modules/auth/controllers/logout_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { buildLogoutUserDTO } from './mappers/request/auth_request_mapper.js'
import {
  getLogoutRedirectPath,
  mapLoggedOutAuthShare,
  shouldUseInertiaLocation,
} from './mappers/response/auth_response_mapper.js'
import LogoutUserCommand from '#modules/auth/actions/commands/logout_user_command'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
```

### `app/modules/auth/controllers/mappers/request/auth_request_mapper.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { LogoutUserDTO } from '#modules/auth/actions/dtos/request/logout_user_dto'
```

### `app/modules/auth/controllers/mappers/request/social_auth_request_mapper.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
```

### `app/modules/auth/controllers/mappers/response/auth_response_mapper.ts`

```ts
import { AuthRoutes } from '#modules/http/public_contracts/route_constants'
```

### `app/modules/auth/controllers/mappers/response/social_auth_response_mapper.ts`

```ts
import { AuthRoutes } from '#modules/http/public_contracts/route_constants'
```

### `app/modules/auth/controllers/social_auth_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import {
  buildSocialAuthCallbackLogContext,
  buildSocialAuthCallbackUrl,
  buildSocialAuthRedirectLogContext,
  buildSupportedSocialAuthProvider,
} from './mappers/request/social_auth_request_mapper.js'
import {
  mapSocialAuthErrorRedirect,
  mapSocialAuthSessionState,
  mapSocialAuthSuccessRedirect,
} from './mappers/response/social_auth_response_mapper.js'
import ProcessSocialAuthCallbackCommand from '#modules/auth/actions/commands/process_social_auth_callback_command'
import {
  logSocialAuthCallbackStart,
  logSocialAuthConfigCheck,
  logSocialAuthRedirect,
} from '#modules/auth/actions/support/social_auth_logging'
import env from '#start/env'
```
## Code Snippets

### `start/routes/auth.ts`

```ts
import router from '@adonisjs/core/services/router'

import { middleware } from '../kernel.js'

import { loginThrottle } from '#start/limiter'

// Auth controllers - Only OAuth and Logout
const LogoutController = () => import('#modules/auth/controllers/logout_controller')
const SocialAuthController = () => import('#modules/auth/controllers/social_auth_controller')

// Social authentication routes (OAuth only)
// FIX BẢO MẬT: Apply loginThrottle — chống brute-force OAuth redirect
router.get('/auth/:provider/redirect', [SocialAuthController, 'redirect']).use(loginThrottle)
router.get('/auth/:provider/callback', [SocialAuthController, 'callback']).use(loginThrottle)

// Logout routes
router.post('/logout', [LogoutController, 'handle']).as('logout').use(middleware.auth())
router.get('/logout', [LogoutController, 'handle']).as('logout.show').use(middleware.auth())

// Redirect /login to OAuth page (for backward compatibility)
router
  .get('/login', ({ inertia }) => {
    return inertia.render('auth/login', {})
  })
  .use(loginThrottle)

```

### `app/modules/auth/actions/commands/logout_user_command.ts`

```ts
import emitter from '@adonisjs/core/services/emitter'

import { BaseCommand } from '../base_command.js'
import type { LogoutUserDTO } from '../dtos/request/logout_user_dto.js'

import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'

export default class LogoutUserCommand extends BaseCommand<LogoutUserDTO> {
  async handle(dto: LogoutUserDTO): Promise<void> {
    if (this.execCtx.userId) {
      await auditPublicApi.write(this.execCtx, {
        user_id: this.execCtx.userId,
        action: 'logout',
        entity_type: 'user',
        entity_id: dto.userId,
        old_values: null,
        new_values: {
          timestamp: new Date(),
          ip: dto.ipAddress,
          sessionId: dto.sessionId,
        },
      })
    }

    // Emit user:logout event
    void emitter.emit('user:logout', {
      userId: dto.userId,
      ip: dto.ipAddress || '',
    })
  }
}

```

### `app/modules/auth/actions/commands/process_social_auth_callback_command.ts`

```ts
import SocialLoginCommand from './social_login_command.js'

import SocialAuthProviderService, {
  type SocialAuthDriver,
  type SocialAuthFailureResult,
  type SupportedSocialAuthProvider,
} from '#modules/auth/infra/oauth/social_auth_provider_service'
import type { SocialAuthenticatedUser } from '#modules/auth/infra/social_login_persistence_service'

interface SocialAuthSuccessResult {
  type: 'success'
  user: SocialAuthenticatedUser
  redirectTo: string
  currentOrganizationId: SocialAuthenticatedUser['current_organization_id'] | null
}

export type ProcessSocialAuthCallbackResult = SocialAuthFailureResult | SocialAuthSuccessResult

export default class ProcessSocialAuthCallbackCommand {
  constructor(private readonly socialAuthProviderService = new SocialAuthProviderService()) {}

  async execute(
    provider: SupportedSocialAuthProvider,
    socialAuth: SocialAuthDriver
  ): Promise<ProcessSocialAuthCallbackResult> {
    const callbackData = await this.socialAuthProviderService.readCallback(provider, socialAuth)
    if (callbackData.type === 'error') {
      return callbackData
    }

    const result = await new SocialLoginCommand().execute(provider, callbackData.socialUser)

    return {
      type: 'success',
      user: result.user,
      redirectTo: result.redirectTo,
      currentOrganizationId: result.user.current_organization_id ?? null,
    }
  }
}

```

### `app/modules/auth/actions/commands/social_login_command.ts`

```ts
import emitter from '@adonisjs/core/services/emitter'
import db from '@adonisjs/lucid/services/db'

import SocialLoginPersistenceService, {
  type SocialAuthenticatedUser,
  type SocialLoginInput,
  type SupportedProvider,
} from '#modules/auth/infra/social_login_persistence_service'
import { singleFlight } from '#modules/cache/public_contracts/cache_store'
import * as AuthLogger from '#modules/logger/public_contracts/auth_logger'

interface SocialUserData {
  id: string
  email: string
  name: string
  nickName: string | null
  token: string
  refreshToken: string | null
}

interface SocialLoginResult {
  user: SocialAuthenticatedUser
  isNewUser: boolean
  redirectTo: string
}

/**
 * Command: Social Login
 *
 * Handles the full social login flow:
 * 1. Check if OAuth provider record exists → login existing user
 * 2. Check if user with email exists → link provider + login
 * 3. Create new user + OAuth record → login
 */
export default class SocialLoginCommand {
  constructor(private readonly persistenceService = new SocialLoginPersistenceService()) {}

  async execute(
    provider: SupportedProvider,
    socialData: SocialUserData
  ): Promise<SocialLoginResult> {
    const loginInput = this.buildLoginInput(provider, socialData)

    return singleFlight.execute(this.buildSingleFlightKey(loginInput), () =>
      this.executeLoginFlow(loginInput)
    )
  }

  /**
   * Determine redirect path based on user's system role and organization context
   */
  private determineRedirectPath(user: SocialAuthenticatedUser): string {
    // 1. Superadmin/System Admin → Admin interface
    if (user.system_role === 'superadmin' || user.system_role === 'system_admin') {
      return '/admin'
    }

    // 2. User with organization context → Tasks (default workspace)
    if (user.current_organization_id) {
      return '/tasks'
    }

    // 3. User without organization → Organizations selection
    return '/organizations'
  }

  private buildLoginInput(
    provider: SupportedProvider,
    socialData: SocialUserData
  ): SocialLoginInput {
    return {
      provider,
      socialId: socialData.id,
      socialEmail: socialData.email,
      nickName: socialData.nickName,
      accessToken: socialData.token,
      refreshToken: socialData.refreshToken,
    }
  }

  private buildSingleFlightKey(loginInput: SocialLoginInput): string {
    return `social_login:${loginInput.provider}:${loginInput.socialId}`
  }

  private async executeLoginFlow(loginInput: SocialLoginInput): Promise<SocialLoginResult> {
    const linkedUser = await this.persistenceService.findLinkedUser(loginInput)
    if (linkedUser) {
      return this.finalizeExistingUserLogin(linkedUser, loginInput.provider)
    }

    const existingUser = await db.transaction((trx) =>
      this.persistenceService.linkExistingUserByEmail(loginInput, trx)
    )
    if (existingUser) {
      return this.finalizeExistingUserLogin(existingUser, loginInput.provider)
    }

    const createdUser = await db.transaction((trx) =>
      this.persistenceService.registerNewUser(loginInput, trx)
    )
    return this.finalizeNewUserLogin(createdUser, loginInput.provider)
  }

  private recordSuccessfulLogin(user: SocialAuthenticatedUser, provider: SupportedProvider): void {
    AuthLogger.userLogin(user.id, user.email ?? '', provider)
    void emitter.emit('user:login', {
      userId: user.id,
      ip: '',
      userAgent: '',
      method: 'oauth',
    })
  }

  private finalizeExistingUserLogin(
    user: SocialAuthenticatedUser,
    provider: SupportedProvider
  ): SocialLoginResult {
    this.recordSuccessfulLogin(user, provider)
    return this.buildExistingUserResult(user)
  }

  private finalizeNewUserLogin(
    user: SocialAuthenticatedUser,
    provider: SupportedProvider
  ): SocialLoginResult {
    this.recordSuccessfulLogin(user, provider)
    return {
      user,
      isNewUser: true,
      redirectTo: '/organizations',
    }
  }

  private buildExistingUserResult(user: SocialAuthenticatedUser): SocialLoginResult {
    return {
      user,
      isNewUser: false,
      redirectTo: this.determineRedirectPath(user),
    }
  }
}

```

### `app/modules/auth/controllers/logout_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'


import { buildLogoutUserDTO } from './mappers/request/auth_request_mapper.js'
import {
  getLogoutRedirectPath,
  mapLoggedOutAuthShare,
  shouldUseInertiaLocation,
} from './mappers/response/auth_response_mapper.js'

import LogoutUserCommand from '#modules/auth/actions/commands/logout_user_command'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'

/**
 * LogoutController
 *
 * Handles user logout via web interface.
 * This is a thin controller that delegates to LogoutUserCommand.
 *
 * Routes:
 * - POST /logout - Process logout
 * - GET /logout - Process logout
 */
export default class LogoutController {
  /**
   * Handle logout request
   * Uses LogoutUserCommand for business logic
   */
  async handle(ctx: HttpContext) {
    const { request, response, inertia, session, auth } = ctx

    // 1. Build DTO
    if (!auth.user) {
      response.redirect().toPath(getLogoutRedirectPath())
      return
    }

    const dto = buildLogoutUserDTO(request, auth.user.id, session.sessionId)

    // 2. Execute command (audit log + event emission)
    const command = new LogoutUserCommand(actionContextFromHttp(ctx))
    await command.handle(dto)

    // 3. Handle HTTP-specific logout operations (auth, session, inertia)
    await auth.use('web').logout()
    session.forget('auth')
    session.forget('show_organization_required_modal')
    session.forget('intended_url')
    inertia.share(mapLoggedOutAuthShare())

    // 4. Redirect to login — always use inertia.location for full page redirect
    //    (session.flash won't work after session is cleared)
    const isInertia = request.header('X-Inertia')
    if (shouldUseInertiaLocation(isInertia)) {
      inertia.location(getLogoutRedirectPath())
      return
    }
    response.redirect().toPath(getLogoutRedirectPath())
  }
}

```

### `app/modules/auth/controllers/mappers/request/auth_request_mapper.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'

import { LogoutUserDTO } from '#modules/auth/actions/dtos/request/logout_user_dto'

export function buildLogoutUserDTO(
  request: HttpContext['request'],
  userId: string,
  sessionId: string | undefined
): LogoutUserDTO {
  return new LogoutUserDTO({
    userId,
    sessionId,
    ipAddress: request.ip(),
  })
}

```

### `app/modules/auth/controllers/mappers/request/social_auth_request_mapper.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'

import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'

export type SupportedSocialAuthProvider = 'google' | 'github'

const SUPPORTED_SOCIAL_AUTH_PROVIDERS = new Set<SupportedSocialAuthProvider>(['google', 'github'])

export function buildSupportedSocialAuthProvider(provider: string): SupportedSocialAuthProvider {
  const normalizedProvider = provider.trim().toLowerCase()
  if (SUPPORTED_SOCIAL_AUTH_PROVIDERS.has(normalizedProvider as SupportedSocialAuthProvider)) {
    return normalizedProvider as SupportedSocialAuthProvider
  }

  throw new BusinessLogicException(ErrorMessages.INVALID_INPUT)
}

export function buildSocialAuthCallbackUrl(provider: SupportedSocialAuthProvider) {
  return `http://localhost:3333/auth/${provider}/callback`
}

export function buildSocialAuthRedirectLogContext(request: HttpContext['request']) {
  return {
    referer: request.header('referer'),
    userAgent: request.header('user-agent'),
    ip: request.ip(),
  }
}

export function buildSocialAuthCallbackLogContext(request: HttpContext['request']) {
  return {
    query: request.qs(),
    referer: request.header('referer'),
    ip: request.ip(),
  }
}

```

### `app/modules/auth/controllers/mappers/response/auth_response_mapper.ts`

```ts
import { AuthRoutes } from '#modules/http/public_contracts/route_constants'

export function getLogoutRedirectPath() {
  return AuthRoutes.LOGIN
}

export function shouldUseInertiaLocation(isInertiaRequest: string | undefined) {
  return Boolean(isInertiaRequest)
}

export function mapLoggedOutAuthShare() {
  return {
    auth: {
      user: null,
    },
  }
}

```

### `app/modules/auth/controllers/mappers/response/social_auth_response_mapper.ts`

```ts
import { AuthRoutes } from '#modules/http/public_contracts/route_constants'

export function mapSocialAuthErrorRedirect(errorMessage: string) {
  return {
    path: AuthRoutes.LOGIN,
    query: {
      error: errorMessage,
    },
  }
}

export function mapSocialAuthSuccessRedirect(redirectTo: string) {
  return {
    redirectTo,
  }
}

export function mapSocialAuthSessionState(currentOrganizationId: string | null | undefined) {
  if (!currentOrganizationId) {
    return null
  }

  return {
    currentOrganizationId,
  }
}

```

### `app/modules/auth/controllers/social_auth_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'

import {
  buildSocialAuthCallbackLogContext,
  buildSocialAuthCallbackUrl,
  buildSocialAuthRedirectLogContext,
  buildSupportedSocialAuthProvider,
} from './mappers/request/social_auth_request_mapper.js'
import {
  mapSocialAuthErrorRedirect,
  mapSocialAuthSessionState,
  mapSocialAuthSuccessRedirect,
} from './mappers/response/social_auth_response_mapper.js'

import ProcessSocialAuthCallbackCommand from '#modules/auth/actions/commands/process_social_auth_callback_command'
import {
  logSocialAuthCallbackStart,
  logSocialAuthConfigCheck,
  logSocialAuthRedirect,
} from '#modules/auth/actions/support/social_auth_logging'
import env from '#start/env'

export default class SocialAuthController {
  /**
   * Chuyển hướng người dùng đến trang đăng nhập của nhà cung cấp
   */
  async redirect({ params, ally, request }: HttpContext) {
    const provider = buildSupportedSocialAuthProvider(params.provider as string)

    const hasClientId = !!env.get(`${provider.toUpperCase()}_CLIENT_ID`)
    const hasClientSecret = !!env.get(`${provider.toUpperCase()}_CLIENT_SECRET`)
    const callbackUrl = buildSocialAuthCallbackUrl(provider)
    logSocialAuthConfigCheck(provider, hasClientId, hasClientSecret, callbackUrl)

    logSocialAuthRedirect(provider, buildSocialAuthRedirectLogContext(request))
    const socialAuth = ally.use(provider)
    await socialAuth.redirect()
  }

  /**
   * Xử lý callback từ nhà cung cấp xác thực
   */
  async callback({ params, ally, auth, response, request, session }: HttpContext) {
    const provider = buildSupportedSocialAuthProvider(params.provider as string)

    logSocialAuthCallbackStart(provider, buildSocialAuthCallbackLogContext(request))

    const callbackResult = await new ProcessSocialAuthCallbackCommand().execute(
      provider,
      ally.use(provider)
    )
    if (callbackResult.type === 'error') {
      const errorRedirect = mapSocialAuthErrorRedirect(callbackResult.errorMessage)
      response.redirect().withQs(errorRedirect.query).toPath(errorRedirect.path)
      return
    }

    await auth.use('web').login(callbackResult.user)
    const sessionState = mapSocialAuthSessionState(callbackResult.currentOrganizationId)
    if (sessionState) {
      session.put('current_organization_id', sessionState.currentOrganizationId)
    }

    response.redirect(mapSocialAuthSuccessRedirect(callbackResult.redirectTo).redirectTo)
  }
}

```
