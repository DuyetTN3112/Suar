/**
 * JSON shape persisted with a user record.
 *
 * This type is intentionally owned by users. The settings module exposes its
 * own structurally compatible public contract so neither module needs to
 * import the other's internal representation.
 */
export interface StoredUserSettingData {
  theme: 'light' | 'dark' | 'system'
  notifications_enabled: boolean
  display_mode: 'grid' | 'list'
  font: string
  layout: string
  density: string
  animations_enabled: boolean
  custom_scrollbars: boolean
}
