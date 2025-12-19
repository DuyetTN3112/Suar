import { writable } from 'svelte/store'

export interface ConfirmDialogOptions {
  title: string
  desc: string
  confirmText?: string
  cancelBtnText?: string
  destructive?: boolean
}

export interface ConfirmDialogState extends Required<ConfirmDialogOptions> {
  open: boolean
}

const DEFAULT_STATE: ConfirmDialogState = {
  open: false,
  title: '',
  desc: '',
  confirmText: 'Confirm',
  cancelBtnText: 'Cancel',
  destructive: false,
}

const state = writable<ConfirmDialogState>(DEFAULT_STATE)

let resolver: ((confirmed: boolean) => void) | null = null

function resetState() {
  state.set(DEFAULT_STATE)
}

function closeWith(confirmed: boolean) {
  resolver?.(confirmed)
  resolver = null
  resetState()
}

export const confirmDialogStore = {
  subscribe: state.subscribe,
  request(options: ConfirmDialogOptions): Promise<boolean> {
    if (resolver) {
      closeWith(false)
    }

    return new Promise<boolean>((resolve) => {
      resolver = resolve
      state.set({
        open: true,
        title: options.title,
        desc: options.desc,
        confirmText: options.confirmText ?? DEFAULT_STATE.confirmText,
        cancelBtnText: options.cancelBtnText ?? DEFAULT_STATE.cancelBtnText,
        destructive: options.destructive ?? DEFAULT_STATE.destructive,
      })
    })
  },
  confirm() {
    closeWith(true)
  },
  cancel() {
    closeWith(false)
  },
  setOpen(open: boolean) {
    if (!open) {
      closeWith(false)
    }
  },
}
