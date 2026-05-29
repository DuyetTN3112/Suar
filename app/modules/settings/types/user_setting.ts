export interface UserSettingData {
  theme: 'light' | 'dark' | 'system'
  notifications_enabled: boolean
  display_mode: 'grid' | 'list'
  font: string
  layout: string
  density: string
  animations_enabled: boolean
  custom_scrollbars: boolean
}

export interface UserSettingUpdate {
  theme?: 'light' | 'dark' | 'system'
  notifications_enabled?: boolean
  display_mode?: 'grid' | 'list'
  font?: string
  layout?: string
  density?: string
  animations_enabled?: boolean
  custom_scrollbars?: boolean
}

export const DEFAULT_USER_SETTING: UserSettingData = {
  theme: 'light',
  notifications_enabled: true,
  display_mode: 'grid',
  font: 'brand',
  layout: 'default',
  density: 'default',
  animations_enabled: true,
  custom_scrollbars: true,
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
