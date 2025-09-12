export interface SettingsResponse {
  theme: 'light' | 'dark' | 'system'
  notificationsEnabled: boolean
  displayMode: 'grid' | 'list'
  font: string
  layout: string
  density: string
  animationsEnabled: boolean
  customScrollbars: boolean
}
