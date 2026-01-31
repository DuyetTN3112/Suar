<script lang="ts" module>
  // Sidebar constants
  export const SIDEBAR_COOKIE_NAME = 'sidebar_state'
  export const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7
  export const SIDEBAR_KEYBOARD_SHORTCUT = 'b'
  export const SIDEBAR_WIDTH = '16rem'
  export const SIDEBAR_WIDTH_ICON = '3.5rem'
  export const SIDEBAR_WIDTH_MOBILE = '100%'
</script>

<script lang="ts">
  import { setContext } from 'svelte'
  import { writable } from 'svelte/store'
  import { cn } from '$lib/utils-svelte'
  import { Tooltip } from 'bits-ui'
  import type { Snippet } from 'svelte'
  import type { HTMLAttributes } from 'svelte/elements'

  // Check if we're in browser (not SSR)
  const browser = typeof window !== 'undefined'

  type Props = HTMLAttributes<HTMLDivElement> & {
    defaultOpen?: boolean
    open?: boolean
    onOpenChange?: (open: boolean) => void
    class?: string
    children?: Snippet
  }

  const {
    defaultOpen = true,
    open: openProp,
    onOpenChange: setOpenProp,
    class: className,
    style,
    children,
    ...restProps
  }: Props = $props()

  // Mobile detection
  let isMobile = $state(false)
  let openMobile = $state(false)
  let internalOpen = $state(defaultOpen)

  // Get open state
  const open = $derived(openProp ?? internalOpen)
  const state = $derived(open ? 'expanded' : 'collapsed')

  // Initialize mobile check
  $effect(() => {
    if (browser) {
      const checkMobile = () => {
        isMobile = window.innerWidth < 768
      }
      checkMobile()
      window.addEventListener('resize', checkMobile)
      return () => { window.removeEventListener('resize', checkMobile); }
    }
  })

  // Keyboard shortcut
  $effect(() => {
    if (browser) {
      const handleKeyDown = (event: KeyboardEvent) => {
        if (
          event.key === SIDEBAR_KEYBOARD_SHORTCUT &&
          (event.metaKey || event.ctrlKey)
        ) {
          event.preventDefault()
          toggleSidebar()
        }
      }
      window.addEventListener('keydown', handleKeyDown)
      return () => { window.removeEventListener('keydown', handleKeyDown); }
    }
  })

  function setOpen(value: boolean) {
    if (setOpenProp) {
      setOpenProp(value)
    } else {
      internalOpen = value
    }
    if (browser) {
      document.cookie = `${SIDEBAR_COOKIE_NAME}=${value}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`
    }
  }

  function toggleSidebar() {
    if (isMobile) {
      openMobile = !openMobile
    } else {
      setOpen(!open)
    }
  }

  // Create context store
  const sidebarContext = {
    get open() { return open },
    get state() { return state },
    get isMobile() { return isMobile },
    get openMobile() { return openMobile },
    setOpen,
    setOpenMobile: (value: boolean) => { openMobile = value },
    toggleSidebar
  }

  setContext('sidebar', sidebarContext)
</script>

<Tooltip.Provider delayDuration={0}>
  <div
    data-slot="sidebar-wrapper"
    style="--sidebar-width: {SIDEBAR_WIDTH}; --sidebar-width-icon: {SIDEBAR_WIDTH_ICON}; {style || ''}"
    class={cn('group/sidebar-wrapper has-data-[variant=inset]:bg-sidebar flex min-h-svh w-full', className)}
    {...restProps}
  >
    {@render children?.()}
  </div>
</Tooltip.Provider>
