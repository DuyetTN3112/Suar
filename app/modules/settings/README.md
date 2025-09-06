# settings Backend Module

## Runtime Update 2026-06-07

User settings không còn là client-only stub. Runtime hiện persist vào cột JSONB `users.user_setting` và luôn merge với defaults trong `mergeUserSetting`.

File chính:

- [app/modules/settings/types/user_setting.ts](/home/tranngocduyet/Projects/Suar/app/modules/settings/types/user_setting.ts)
- [app/modules/settings/actions/get_user_settings.ts](/home/tranngocduyet/Projects/Suar/app/modules/settings/actions/get_user_settings.ts)
- [app/modules/settings/actions/update_user_settings.ts](/home/tranngocduyet/Projects/Suar/app/modules/settings/actions/update_user_settings.ts)
- [app/modules/settings/infra/repositories/user_settings_repository.ts](/home/tranngocduyet/Projects/Suar/app/modules/settings/infra/repositories/user_settings_repository.ts)
- [database/migrations/20260607125500_add_user_setting_to_users.ts](/home/tranngocduyet/Projects/Suar/database/migrations/20260607125500_add_user_setting_to_users.ts)

Current behavior:

- `GetUserSettings.handle(userId)` đọc persisted `user_setting`, merge defaults, trả payload ổn định cho Inertia pages
- `UpdateUserSettings.handle({ userId, data })` merge partial updates rồi persist về `users.user_setting`
- `InertiaMiddleware` inject `auth.user.user_setting` đã merge defaults để frontend tabs có cùng source-of-truth

## Module Path

```text
app/modules/settings
```

## Folder And File Inventory

```text
./ README.md
actions/commands/ update_account_settings_command.ts update_profile_settings_command.ts
actions/ get_user_settings.ts setting_action_context.ts update_user_settings.ts
controllers/mappers/request/ settings_request_mapper.ts
controllers/mappers/response/ settings_response_mapper.ts
controllers/ show_settings_controller.ts update_account_settings_controller.ts update_appearance_settings_controller.ts update_display_settings_controller.ts update_notification_settings_controller.ts update_profile_settings_controller.ts update_settings_controller.ts
controllers/v1/ show_settings_controller.ts update_settings_controller.ts
infra/repositories/ user_settings_repository.ts
types/ user_setting.ts
validators/ setting.ts
```

## Route Evidence

```text
start/routes/api_v1.ts
start/routes/settings.ts
```

## Symbol Evidence

| Kind | Symbol | File | Line |
|---|---|---|---:|
| class | `UpdateAccountSettingsCommand` | `app/modules/settings/actions/commands/update_account_settings_command.ts` | 5 |
| class | `UpdateProfileSettingsCommand` | `app/modules/settings/actions/commands/update_profile_settings_command.ts` | 5 |
| class | `GetUserSettings` | `app/modules/settings/actions/get_user_settings.ts` | 5 |
| interface | `SettingActionContext` | `app/modules/settings/actions/setting_action_context.ts` | 1 |
| interface | `AuthenticatedSettingActionContext` | `app/modules/settings/actions/setting_action_context.ts` | 8 |
| function | `makeSystemSettingActionContext` | `app/modules/settings/actions/setting_action_context.ts` | 12 |
| class | `UpdateUserSettings` | `app/modules/settings/actions/update_user_settings.ts` | 9 |
| function | `buildUpdateAccountSettingsDTO` | `app/modules/settings/controllers/mappers/request/settings_request_mapper.ts` | 9 |
| function | `buildUpdateProfileSettingsDTO` | `app/modules/settings/controllers/mappers/request/settings_request_mapper.ts` | 21 |
| function | `getAccountSettingsUpdatedMessage` | `app/modules/settings/controllers/mappers/response/settings_response_mapper.ts` | 1 |
| function | `getProfileSettingsUpdatedMessage` | `app/modules/settings/controllers/mappers/response/settings_response_mapper.ts` | 5 |
| class | `ShowSettingsController` | `app/modules/settings/controllers/show_settings_controller.ts` | 9 |
| class | `UpdateAccountSettingsController` | `app/modules/settings/controllers/update_account_settings_controller.ts` | 14 |
| class | `UpdateAppearanceSettingsController` | `app/modules/settings/controllers/update_appearance_settings_controller.ts` | 11 |
| class | `UpdateDisplaySettingsController` | `app/modules/settings/controllers/update_display_settings_controller.ts` | 9 |
| class | `UpdateNotificationSettingsController` | `app/modules/settings/controllers/update_notification_settings_controller.ts` | 9 |
| class | `UpdateProfileSettingsController` | `app/modules/settings/controllers/update_profile_settings_controller.ts` | 14 |
| class | `UpdateSettingsController` | `app/modules/settings/controllers/update_settings_controller.ts` | 11 |
| class | `ShowSettingsController` | `app/modules/settings/controllers/v1/show_settings_controller.ts` | 7 |
| class | `UpdateSettingsController` | `app/modules/settings/controllers/v1/update_settings_controller.ts` | 15 |
| interface | `UserSettingData` | `app/modules/settings/types/user_setting.ts` | 1 |
| interface | `UserSettingUpdate` | `app/modules/settings/types/user_setting.ts` | 12 |
| const | `DEFAULT_USER_SETTING` | `app/modules/settings/types/user_setting.ts` | 23 |
| function | `mergeUserSetting` | `app/modules/settings/types/user_setting.ts` | 34 |
| const | `accountSettingValidator` | `app/modules/settings/validators/setting.ts` | 6 |
| const | `appearanceSettingValidator` | `app/modules/settings/validators/setting.ts` | 20 |
| const | `notificationSettingValidator` | `app/modules/settings/validators/setting.ts` | 30 |

## Import Evidence

### `app/modules/settings/actions/commands/update_account_settings_command.ts`

```ts
import type { SettingActionContext } from '#modules/settings/actions/setting_action_context'
import { userPublicApi, type UpdateUserProfileDTO } from '#modules/users/public_contracts/user_public_api'
import type { UserRecord } from '#modules/users/types/user_records'
```

### `app/modules/settings/actions/commands/update_profile_settings_command.ts`

```ts
import type { SettingActionContext } from '#modules/settings/actions/setting_action_context'
import { userPublicApi, type UpdateUserProfileDTO } from '#modules/users/public_contracts/user_public_api'
import type { UserRecord } from '#modules/users/types/user_records'
```

### `app/modules/settings/actions/get_user_settings.ts`

```ts
import { mergeUserSetting } from '../types/user_setting.js'
import { getUserSettingRecord } from '#modules/settings/infra/repositories/user_settings_repository'
```

### `app/modules/settings/actions/setting_action_context.ts`

```ts
// no imports
```

### `app/modules/settings/actions/update_user_settings.ts`

```ts
import type { UserSettingUpdate } from '../types/user_setting.js'
import { mergeUserSetting } from '../types/user_setting.js'
import {
  getUserSettingRecord,
  updateUserSettingRecord,
} from '#modules/settings/infra/repositories/user_settings_repository'
```

### `app/modules/settings/controllers/mappers/request/settings_request_mapper.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { UpdateUserProfileDTO } from '#modules/users/public_contracts/update_user_profile_dto'
```

### `app/modules/settings/controllers/mappers/response/settings_response_mapper.ts`

```ts
// no imports
```

### `app/modules/settings/controllers/show_settings_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import GetUserSettings from '#modules/settings/actions/get_user_settings'
```

### `app/modules/settings/controllers/update_account_settings_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { buildUpdateAccountSettingsDTO } from './mappers/request/settings_request_mapper.js'
import { getAccountSettingsUpdatedMessage } from './mappers/response/settings_response_mapper.js'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import UpdateAccountSettingsCommand from '#modules/settings/actions/commands/update_account_settings_command'
```

### `app/modules/settings/controllers/update_appearance_settings_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import UpdateUserSettings from '#modules/settings/actions/update_user_settings'
```

### `app/modules/settings/controllers/update_display_settings_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import UpdateUserSettings from '#modules/settings/actions/update_user_settings'
```

### `app/modules/settings/controllers/update_notification_settings_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import UpdateUserSettings from '#modules/settings/actions/update_user_settings'
```

### `app/modules/settings/controllers/update_profile_settings_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { buildUpdateProfileSettingsDTO } from './mappers/request/settings_request_mapper.js'
import { getProfileSettingsUpdatedMessage } from './mappers/response/settings_response_mapper.js'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import UpdateProfileSettingsCommand from '#modules/settings/actions/commands/update_profile_settings_command'
```

### `app/modules/settings/controllers/update_settings_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import UpdateUserSettings from '#modules/settings/actions/update_user_settings'
```

### `app/modules/settings/controllers/v1/show_settings_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { mapApiV1SettingsResponse } from '#modules/http/api_v1/response_mappers'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import GetUserSettings from '#modules/settings/actions/get_user_settings'
```

### `app/modules/settings/controllers/v1/update_settings_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'
import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import { mapApiV1SettingsResponse } from '#modules/http/api_v1/response_mappers'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import UpdateUserSettings from '#modules/settings/actions/update_user_settings'
import type { UserSettingUpdate } from '#modules/settings/types/user_setting'
```
## Code Snippets

### `start/routes/settings.ts`

```ts
import router from '@adonisjs/core/services/router'

import { middleware } from '../kernel.js'

import { throttle } from '#start/limiter'

const ShowSettingsController = () => import('#modules/settings/controllers/show_settings_controller')
const UpdateSettingsController = () => import('#modules/settings/controllers/update_settings_controller')
const UpdateProfileSettingsController = () =>
  import('#modules/settings/controllers/update_profile_settings_controller')
const UpdateAccountSettingsController = () =>
  import('#modules/settings/controllers/update_account_settings_controller')
const UpdateAppearanceSettingsController = () =>
  import('#modules/settings/controllers/update_appearance_settings_controller')
const UpdateDisplaySettingsController = () =>
  import('#modules/settings/controllers/update_display_settings_controller')
const UpdateNotificationSettingsController = () =>
  import('#modules/settings/controllers/update_notification_settings_controller')

router
  .group(() => {
    // Settings routes
    router.get('/settings', [ShowSettingsController, 'handle']).as('settings.index')
    router.put('/settings', [UpdateSettingsController, 'handle']).as('settings.update')

    // Profile settings
    router
      .get('/settings/profile', async ({ inertia }) => {
        return inertia.render('settings/profile', {})
      })
      .as('settings.profile')
    router
      .post('/settings/profile', [UpdateProfileSettingsController, 'handle'])
      .as('settings.profile.update')

    // Account settings
    router
      .get('/settings/account', async ({ inertia }) => {
        return inertia.render('settings/account', {})
      })
      .as('settings.account')
    router
      .post('/settings/account', [UpdateAccountSettingsController, 'handle'])
      .as('settings.account.update')

    // Appearance settings
    router
      .get('/settings/appearance', async ({ inertia }) => {
        return inertia.render('settings/appearance', {})
      })
      .as('settings.appearance')
    router
      .post('/settings/appearance', [UpdateAppearanceSettingsController, 'handle'])
      .as('settings.appearance.update')
    // Display settings
    router
      .get('/settings/display', async ({ inertia }) => {
        return inertia.render('settings/display', {})
      })
      .as('settings.display')
    router
      .post('/settings/display', [UpdateDisplaySettingsController, 'handle'])
      .as('settings.display.update')
    // Notifications settings
    router
      .get('/settings/notifications', async ({ inertia }) => {
        return inertia.render('settings/notifications', {})
      })
      .as('settings.notifications')
    router
      .post('/settings/notifications', [UpdateNotificationSettingsController, 'handle'])
      .as('settings.notifications.update')

    // Existing account routes
    router
      .get('/account', async ({ inertia }) => {
        return inertia.render('settings/account', {})
      })
      .as('account.index')
    router
      .delete('/account', ({ response }) => {
        // Xử lý xóa tài khoản
        response.redirect('/login')
      })
      .as('account.destroy')
  })
  .use([middleware.auth(), throttle])

```

### `app/modules/settings/actions/commands/update_account_settings_command.ts`

```ts
import type { SettingActionContext } from '#modules/settings/actions/setting_action_context'
import { userPublicApi, type UpdateUserProfileDTO } from '#modules/users/public_contracts/user_public_api'
import type { UserRecord } from '#modules/users/types/user_records'

export default class UpdateAccountSettingsCommand {
  constructor(protected execCtx: SettingActionContext) {}

  async handle(dto: UpdateUserProfileDTO): Promise<UserRecord> {
    return userPublicApi.updateUserProfile(dto, this.execCtx)
  }
}

```

### `app/modules/settings/actions/commands/update_profile_settings_command.ts`

```ts
import type { SettingActionContext } from '#modules/settings/actions/setting_action_context'
import { userPublicApi, type UpdateUserProfileDTO } from '#modules/users/public_contracts/user_public_api'
import type { UserRecord } from '#modules/users/types/user_records'

export default class UpdateProfileSettingsCommand {
  constructor(protected execCtx: SettingActionContext) {}

  async handle(dto: UpdateUserProfileDTO): Promise<UserRecord> {
    return userPublicApi.updateUserProfile(dto, this.execCtx)
  }
}

```

### `app/modules/settings/controllers/mappers/request/settings_request_mapper.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'

import { UpdateUserProfileDTO } from '#modules/users/public_contracts/update_user_profile_dto'

function toOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined
}

export function buildUpdateAccountSettingsDTO(
  request: HttpContext['request'],
  userId: string,
  fallbackEmail: string | null
): UpdateUserProfileDTO {
  return new UpdateUserProfileDTO(
    userId,
    undefined,
    toOptionalString(request.input('email') as unknown) ?? fallbackEmail ?? undefined
  )
}

export function buildUpdateProfileSettingsDTO(
  request: HttpContext['request'],
  userId: string
): UpdateUserProfileDTO {
  return new UpdateUserProfileDTO(
    userId,
    toOptionalString(request.input('username') as unknown),
    toOptionalString(request.input('email') as unknown)
  )
}

```

### `app/modules/settings/controllers/mappers/response/settings_response_mapper.ts`

```ts
export function getAccountSettingsUpdatedMessage() {
  return 'Thông tin tài khoản đã được cập nhật thành công'
}

export function getProfileSettingsUpdatedMessage() {
  return 'Thông tin hồ sơ đã được cập nhật thành công'
}

```

### `app/modules/settings/controllers/show_settings_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'

import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import GetUserSettings from '#modules/settings/actions/get_user_settings'

/**
 * GET /settings → Show settings page
 */
export default class ShowSettingsController {
  async handle(ctx: HttpContext) {
    const { inertia, auth } = ctx
    const user = auth.user
    if (!user) {
      throw new UnauthorizedException()
    }
    const getUserSettings = new GetUserSettings()
    const settings = await getUserSettings.handle(user.id)
    return inertia.render('settings/index', { settings })
  }
}

```

### `app/modules/settings/controllers/update_account_settings_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'


import { buildUpdateAccountSettingsDTO } from './mappers/request/settings_request_mapper.js'
import { getAccountSettingsUpdatedMessage } from './mappers/response/settings_response_mapper.js'

import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import UpdateAccountSettingsCommand from '#modules/settings/actions/commands/update_account_settings_command'

/**
 * POST /settings/account → Update account settings
 */
export default class UpdateAccountSettingsController {
  async handle(ctx: HttpContext) {
    const { request, response, auth, session } = ctx

    const user = auth.user
    if (!user) {
      throw new UnauthorizedException()
    }
    const dto = buildUpdateAccountSettingsDTO(request, user.id, user.email)
    const command = new UpdateAccountSettingsCommand(actionContextFromHttp(ctx))
    await command.handle(dto)

    session.flash('success', getAccountSettingsUpdatedMessage())
    response.redirect().back()
  }
}

```

### `app/modules/settings/controllers/update_appearance_settings_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'

import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import UpdateUserSettings from '#modules/settings/actions/update_user_settings'

/**
 * POST /settings/appearance → Update appearance settings
 */
export default class UpdateAppearanceSettingsController {
  async handle(ctx: HttpContext) {
    const { request, response, session, auth } = ctx
    const user = auth.user
    if (!user) {
      throw new UnauthorizedException()
    }
    const updateUserSettings = new UpdateUserSettings()

    const data = request.only(['theme', 'font']) as { theme?: string; font?: string }

    if (data.theme && !['light', 'dark', 'system'].includes(data.theme)) {
      throw new BusinessLogicException(ErrorMessages.INVALID_INPUT)
    }

    await updateUserSettings.handle({
      userId: user.id,
      data: {
        theme: data.theme as 'light' | 'dark' | 'system' | undefined,
        font: data.font,
      },
    })
    session.flash('success', 'Giao diện đã được cập nhật thành công')
    response.redirect().back()
  }
}

```

### `app/modules/settings/controllers/update_display_settings_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'

import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import UpdateUserSettings from '#modules/settings/actions/update_user_settings'

/**
 * POST /settings/display → Update display settings
 */
export default class UpdateDisplaySettingsController {
  async handle(ctx: HttpContext) {
    const { request, response, session, auth } = ctx
    const user = auth.user
    if (!user) {
      throw new UnauthorizedException()
    }
    const updateUserSettings = new UpdateUserSettings()

    const data = request.only(['layout', 'density', 'animations_enabled', 'custom_scrollbars']) as {
      layout?: string
      density?: string
      animations_enabled?: boolean
      custom_scrollbars?: boolean
    }
    await updateUserSettings.handle({ userId: user.id, data })
    session.flash('success', 'Tùy chọn hiển thị đã được cập nhật thành công')
    response.redirect().back()
  }
}

```

### `app/modules/settings/controllers/update_notification_settings_controller.ts`

```ts
import type { HttpContext } from '@adonisjs/core/http'

import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import UpdateUserSettings from '#modules/settings/actions/update_user_settings'

/**
 * POST /settings/notifications → Update notification settings
 */
export default class UpdateNotificationSettingsController {
  async handle(ctx: HttpContext) {
    const { request, response, session, auth } = ctx
    const user = auth.user
    if (!user) {
      throw new UnauthorizedException()
    }
    const updateUserSettings = new UpdateUserSettings()

    const emailNotifications = request.input('emailNotifications', false) as boolean

    await updateUserSettings.handle({
      userId: user.id,
      data: {
        notifications_enabled: emailNotifications,
      },
    })
    session.flash('success', 'Cài đặt thông báo đã được cập nhật thành công')
    response.redirect().back()
  }
}

```
