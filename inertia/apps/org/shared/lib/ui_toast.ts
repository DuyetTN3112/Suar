import { toast } from 'svelte-sonner'

function emit(
  kind: 'success' | 'error' | 'info' | 'warning',
  title: string,
  description?: string
) {
  switch (kind) {
    case 'success':
      return toast.success(title, { description })
    case 'error':
      return toast.error(title, { description })
    case 'info':
      return toast.info(title, { description })
    case 'warning':
      return toast.warning(title, { description })
  }
}

export const uiToast = {
  success(title: string, description?: string) {
    return emit('success', title, description)
  },
  error(title: string, description?: string) {
    return emit('error', title, description)
  },
  info(title: string, description?: string) {
    return emit('info', title, description)
  },
  warning(title: string, description?: string) {
    return emit('warning', title, description)
  },
  message(title: string, description?: string) {
    return toast(title, { description })
  },
}
