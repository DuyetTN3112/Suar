import { writable } from 'svelte/store'

// Tạo writable store cho search
function createSearchStore() {
  const { subscribe, set, update } = writable({
    isOpen: false,
    query: '',
  })

  return {
    subscribe,
    open: () => {
      update((state) => ({ ...state, isOpen: true }))
    },
    close: () => {
      update((state) => ({ ...state, isOpen: false }))
    },
    toggle: () => {
      update((state) => ({ ...state, isOpen: !state.isOpen }))
    },
    setQuery: (query: string) => {
      update((state) => ({ ...state, query }))
    },
    reset: () => {
      set({ isOpen: false, query: '' })
    },
  }
}

export const searchStore = createSearchStore()

// Hook-like function để sử dụng trong components
export function useSearch() {
  return searchStore
}
