export const THEME_STORAGE_KEY = 'theme'
export const SYSTEM_THEME_QUERY = '(prefers-color-scheme: dark)'

export const THEME_MODES = ['light', 'dark', 'system'] as const
export type ThemeMode = (typeof THEME_MODES)[number]

export const RESOLVED_THEMES = ['light', 'dark'] as const
export type ResolvedTheme = (typeof RESOLVED_THEMES)[number]

export const THEME_META_COLOR: Record<ResolvedTheme, string> = {
  light: '#ffffff',
  dark: '#171211',
}

export const THEME_OPTIONS: readonly { value: ThemeMode; label: string }[] = [
  { value: 'light', label: 'Sáng' },
  { value: 'dark', label: 'Tối' },
  { value: 'system', label: 'Hệ thống' },
]
