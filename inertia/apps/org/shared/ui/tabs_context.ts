export const TABS_CONTEXT = 'suar.tabs'

export interface TabsContext {
  get value(): string
  setValue: (value: string) => void
  getTriggerId: (value: string) => string
  getContentId: (value: string) => string
}
