export const SELECT_CONTEXT = "ui-select"

export interface SelectContext {
  get value(): string
  get open(): boolean
  get hasOpened(): boolean
  get disabled(): boolean
  setValue: (value: string) => void
  setOpen: (open: boolean) => void
  toggleOpen: () => void
  registerItem: (value: string, label: string) => () => void
  getLabel: (value: string) => string | undefined
}
