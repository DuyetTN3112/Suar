export const SETTING_THEME_OPTIONS = ['light', 'dark', 'system'] as const
export type SettingTheme = (typeof SETTING_THEME_OPTIONS)[number]

export const SETTING_DISPLAY_MODE_OPTIONS = ['grid', 'list'] as const
export type SettingDisplayMode = (typeof SETTING_DISPLAY_MODE_OPTIONS)[number]

export const DEFAULT_USER_SETTING = {
  theme: 'light',
  notifications_enabled: true,
  display_mode: 'grid',
  font: 'brand',
  layout: 'default',
  density: 'default',
  animations_enabled: true,
  custom_scrollbars: true,
} as const
