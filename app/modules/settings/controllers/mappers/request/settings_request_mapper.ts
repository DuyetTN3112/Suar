import type { HttpContext } from '@adonisjs/core/http'

import { omitUndefined } from '#modules/contracts/public_contracts/optional_payload'
import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import type { UserSettingUpdate } from '#modules/settings/public_contracts/user_setting'
import {
  SETTING_DISPLAY_MODE_OPTIONS,
  SETTING_THEME_OPTIONS,
  type SettingDisplayMode,
  type SettingTheme,
} from '#modules/settings/public_contracts/user_setting_constants'
import { UpdateUserProfileDTO } from '#modules/users/public_contracts/update_user_profile_dto'

interface RawWebSettingsUpdate {
  theme?: unknown
  notifications_enabled?: unknown
  display_mode?: unknown
}

type ApiSettingsUpdatePayload = {
  [Key in keyof UserSettingUpdate]-?: UserSettingUpdate[Key] | undefined
}

function toOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined
}

function readAliasedInput(
  request: HttpContext['request'],
  camelKey: string,
  snakeKey: string
): unknown {
  return request.input(camelKey, request.input(snakeKey))
}

function assertSupportedSettingOptions(data: UserSettingUpdate): void {
  if (data.theme && !SETTING_THEME_OPTIONS.includes(data.theme)) {
    throw new BusinessLogicException(ErrorMessages.INVALID_INPUT)
  }

  if (data.display_mode && !SETTING_DISPLAY_MODE_OPTIONS.includes(data.display_mode)) {
    throw new BusinessLogicException(ErrorMessages.INVALID_INPUT)
  }
}

function assembleApiSettingsUpdatePayload(
  request: HttpContext['request']
): ApiSettingsUpdatePayload {
  return {
    theme: readAliasedInput(request, 'theme', 'theme') as UserSettingUpdate['theme'],
    notifications_enabled: readAliasedInput(
      request,
      'notificationsEnabled',
      'notifications_enabled'
    ) as UserSettingUpdate['notifications_enabled'],
    display_mode: readAliasedInput(
      request,
      'displayMode',
      'display_mode'
    ) as UserSettingUpdate['display_mode'],
    font: readAliasedInput(request, 'font', 'font') as UserSettingUpdate['font'],
    layout: readAliasedInput(request, 'layout', 'layout') as UserSettingUpdate['layout'],
    density: readAliasedInput(request, 'density', 'density') as UserSettingUpdate['density'],
    animations_enabled: readAliasedInput(
      request,
      'animationsEnabled',
      'animations_enabled'
    ) as UserSettingUpdate['animations_enabled'],
    custom_scrollbars: readAliasedInput(
      request,
      'customScrollbars',
      'custom_scrollbars'
    ) as UserSettingUpdate['custom_scrollbars'],
  }
}

function normalizeApiSettingsUpdate(payload: ApiSettingsUpdatePayload): UserSettingUpdate {
  return omitUndefined(payload)
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

export function buildWebSettingsUpdate(request: HttpContext['request']): UserSettingUpdate {
  const input = request.only([
    'theme',
    'notifications_enabled',
    'display_mode',
  ]) as RawWebSettingsUpdate
  const data = omitUndefined({
    theme: input.theme as SettingTheme | undefined,
    notifications_enabled: input.notifications_enabled as boolean | undefined,
    display_mode: input.display_mode as SettingDisplayMode | undefined,
  })

  assertSupportedSettingOptions(data)
  return data
}

export function buildApiSettingsUpdate(request: HttpContext['request']): UserSettingUpdate {
  const payload = assembleApiSettingsUpdatePayload(request)
  const data = normalizeApiSettingsUpdate(payload)

  assertSupportedSettingOptions(data)
  return data
}
