// Check if we're in browser (not SSR)
const browser = typeof window !== 'undefined'

/**
 * Check if the screen is mobile size
 * Uses Svelte 5 runes for reactivity
 *
 * @example
 * ```svelte
 * <script>
 *   import { useMobile } from '$lib/stores/mobile.svelte'
 *
 *   const isMobile = useMobile()
 * </script>
 *
 * {#if isMobile.current}
 *   <MobileNav />
 * {:else}
 *   <DesktopNav />
 * {/if}
 * ```
 */
export function useMobile(breakpoint: number = 768) {
  let isMobile = $state(false)

  if (browser) {
    // Kiểm tra lần đầu
    isMobile = window.innerWidth < breakpoint

    $effect(() => {
      const checkMobile = () => {
        isMobile = window.innerWidth < breakpoint
      }

      window.addEventListener('resize', checkMobile)

      return () => {
        window.removeEventListener('resize', checkMobile)
      }
    })
  }

  return {
    get current() {
      return isMobile
    },
  }
}

/**
 * Simple boolean check for mobile (non-reactive, one-time check)
 */
export function isMobileDevice(): boolean {
  if (!browser) return false
  return window.innerWidth < 768
}
