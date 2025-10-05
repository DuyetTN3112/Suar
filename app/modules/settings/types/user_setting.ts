import {
  DEFAULT_USER_SETTING,
  type SettingDisplayMode,
  type SettingTheme,
} from '#modules/settings/constants/user_setting_constants'

export interface UserSettingData {
  theme: SettingTheme
  notifications_enabled: boolean
  display_mode: SettingDisplayMode
  font: string
  layout: string
  density: string
  animations_enabled: boolean
  custom_scrollbars: boolean
}

export interface UserSettingUpdate {
  theme?: SettingTheme
  notifications_enabled?: boolean
  display_mode?: SettingDisplayMode
  font?: string
  layout?: string
  density?: string
  animations_enabled?: boolean
  custom_scrollbars?: boolean
}

export function mergeUserSetting(
  current: Partial<UserSettingData> | null | undefined,
  updates?: UserSettingUpdate
): UserSettingData {
  return {
    ...DEFAULT_USER_SETTING,
    ...(current ?? {}),
    ...(updates ?? {}),
  }
}
