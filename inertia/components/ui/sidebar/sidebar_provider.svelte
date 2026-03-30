<script lang="ts" module>
  export {
    SIDEBAR_COOKIE_MAX_AGE,
    SIDEBAR_COOKIE_NAME,
    SIDEBAR_KEYBOARD_SHORTCUT,
    SIDEBAR_WIDTH,
    SIDEBAR_WIDTH_ICON,
    SIDEBAR_WIDTH_MOBILE,
  } from './sidebar_constants'

  export type SidebarContext = {
    isMobile: boolean
    state: 'expanded' | 'collapsed'
    openMobile: boolean
    setOpenMobile: (value: boolean) => void
    setOpen: (value: boolean) => void
    toggleSidebar: () => void
  }
</script>

<script lang="ts">
  import { setContext } from 'svelte'
  import { cn } from '$lib/utils-svelte'
  import { Tooltip } from 'bits-ui'
  import type { Snippet } from 'svelte'
  import type { HTMLAttributes } from 'svelte/elements'
  import {
    SIDEBAR_COOKIE_MAX_AGE,
    SIDEBAR_COOKIE_NAME,
    SIDEBAR_KEYBOARD_SHORTCUT,
    SIDEBAR_WIDTH,
    SIDEBAR_WIDTH_ICON,
  } from './sidebar_constants'

  type SidebarContext = {
    isMobile: boolean
    state: 'expanded' | 'collapsed'
    openMobile: boolean
    setOpenMobile: (value: boolean) => void
    setOpen: (value: boolean) => void
    toggleSidebar: () => void
  }

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
  let internalOpen = $state(false)

  $effect(() => {
    if (openProp === undefined) {
      internalOpen = defaultOpen
    }
  })

  // Get open state
  const open = $derived.by(() => openProp ?? internalOpen)
  const state = $derived.by(() => (open ? 'expanded' : 'collapsed'))

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
  const sidebarContext: SidebarContext = {
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
