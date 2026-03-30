/**
 * Debounce function cho Svelte 5
 * Sử dụng với $effect để tạo debounced values
 *
 * @example
 * ```svelte
 * <script>
 *   import { createDebounce } from '$lib/stores/debounce.svelte'
 *
 *   let searchTerm = $state('')
 *   let debouncedTerm = $state('')
 *
 *   const debounce = createDebounce(500)
 *
 *   $effect(() => {
 *     debounce(() => {
 *       debouncedTerm = searchTerm
 *     })
 *   })
 * </script>
 * ```
 */
export function createDebounce(delay: number = 500) {
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  return (callback: () => void) => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
    timeoutId = setTimeout(callback, delay)
  }
}

/**
 * Reactive debounced value using Svelte 5 runes
 *
 * @example
 * ```svelte
 * <script>
 *   let searchTerm = $state('')
 *   let debouncedTerm = $derived.by(() => useDebouncedValue(searchTerm, 500))
 * </script>
 * ```
 */
export function useDebouncedValue<T>(value: T, delay: number = 500): T {
  let debouncedValue = $state(value)
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  $effect(() => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
    timeoutId = setTimeout(() => {
      debouncedValue = value
    }, delay)

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  })

  return debouncedValue
}
