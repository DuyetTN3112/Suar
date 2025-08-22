<!--
  SidebarMenuSubButton - Button for sub menu items
-->
<script lang="ts">
  import type { Snippet } from 'svelte'
  import type { HTMLAttributes } from 'svelte/elements'

  import { cn } from '$lib/utils-svelte'

  type Props = HTMLAttributes<HTMLAnchorElement> & {
    size?: 'sm' | 'md' | 'default'
    isActive?: boolean
    children?: Snippet
    asChild?: boolean
  }

  const {
    size = 'md',
    isActive = false,
    class: className,
    children,
    asChild = false,
    ...restProps
  }: Props = $props()
</script>

{#if asChild}
  {#if children}
    {@render children()}
  {/if}
{:else}
  <a
    data-sidebar="menu-sub-button"
    data-size={size}
    data-active={isActive}
    class={cn(
      'flex h-7 min-w-0 -translate-x-px items-center gap-2 overflow-hidden rounded-md px-2 text-sidebar-foreground outline-none ring-sidebar-ring transition-[width,height,padding] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-sidebar-accent-foreground',
      'data-[active=true]:border data-[active=true]:border-sidebar-border data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground data-[active=true]:shadow-neo-sm',
      'data-[size=sm]:h-6',
      'data-[size=md]:h-7',
      'data-[size=default]:h-8',
      className
    )}
    {...restProps}
  >
    {#if children}
      {@render children()}
    {/if}
  </a>
{/if}
