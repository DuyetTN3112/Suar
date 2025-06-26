<script lang="ts">
  import { getContext } from 'svelte'
  import { cn } from '$lib/utils-svelte'
  import Sheet from '../sheet.svelte'
  import SheetContent from '../sheet_content.svelte'
  import SheetHeader from '../sheet_header.svelte'
  import SheetTitle from '../sheet_title.svelte'
  import SheetDescription from '../sheet_description.svelte'
  import type { Snippet } from 'svelte'
  import type { HTMLAttributes } from 'svelte/elements'
  import {
    SIDEBAR_WIDTH,
    SIDEBAR_WIDTH_MOBILE,
    SIDEBAR_WIDTH_ICON
  } from './sidebar_constants'

  type Props = HTMLAttributes<HTMLDivElement> & {
    side?: 'left' | 'right'
    variant?: 'sidebar' | 'inset'
    collapsible?: 'offcanvas' | 'collapse' | 'none'
    class?: string
    children?: Snippet
  }

  const {
    side = 'left',
    collapsible = 'offcanvas',
    class: className,
    children,
    ...restProps
  }: Props = $props()

  type SidebarContext = {
    isMobile: boolean
    state: 'expanded' | 'collapsed'
    openMobile: boolean
    setOpenMobile: (value: boolean) => void
    setOpen: (value: boolean) => void
    toggleSidebar: () => void
  }

  const sidebar = getContext<SidebarContext>('sidebar')

  const sidebarWidth = $derived.by(() =>
    sidebar.state === 'expanded' ? SIDEBAR_WIDTH : SIDEBAR_WIDTH_ICON
  )
</script>

{#if collapsible === 'none'}
  <div
    data-slot="sidebar"
    class={cn(
      'bg-sidebar text-sidebar-foreground flex h-full w-(--sidebar-width) flex-col',
      className
    )}
    {...restProps}
  >
    {@render children?.()}
  </div>
{:else if sidebar.isMobile}
  <Sheet open={sidebar.openMobile} onOpenChange={sidebar.setOpenMobile}>
    <SheetContent
      data-sidebar="sidebar"
      data-slot="sidebar"
      data-mobile="true"
      class="bg-sidebar text-sidebar-foreground w-(--sidebar-width) p-0 [&>button]:hidden"
      style="--sidebar-width: {SIDEBAR_WIDTH_MOBILE}"
      {side}
    >
      <SheetHeader class="sr-only">
        <SheetTitle>Sidebar</SheetTitle>
        <SheetDescription>Displays the mobile sidebar.</SheetDescription>
      </SheetHeader>
      <div class="flex h-full w-full flex-col">
        {@render children?.()}
      </div>
    </SheetContent>
  </Sheet>
{:else}
  <div
    data-sidebar="sidebar"
    data-slot="sidebar"
    data-state={sidebar.state}
    class={cn(
      'bg-sidebar text-sidebar-foreground h-full border-r-2 border-sidebar-border transition-[width] duration-300 ease-in-out',
      className
    )}
    style="--sidebar-width: {sidebarWidth}; width: {sidebarWidth}"
    {...restProps}
  >
    {@render children?.()}
  </div>
{/if}
