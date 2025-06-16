<script lang="ts">
  import { getContext } from 'svelte'
  import { cn } from '$lib/utils-svelte'
  import { Tooltip } from 'bits-ui'
  import type { Snippet } from 'svelte'
  import type { HTMLButtonAttributes } from 'svelte/elements'

  type Props = HTMLButtonAttributes & {
    class?: string
    children?: Snippet
    tooltip?: string
    variant?: 'default' | 'outline'
    size?: 'default' | 'sm' | 'lg'
    isActive?: boolean
    asChild?: boolean
  }

  const {
    class: className,
    children,
    tooltip,
    variant = 'default',
    size = 'default',
    isActive = false,
    ...restProps
  }: Props = $props()

  const sidebar = getContext<{
    state: 'expanded' | 'collapsed'
    isMobile: boolean
  }>('sidebar')

  const baseClass = 'peer/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm font-medium outline-hidden ring-sidebar-ring transition-[width,height,padding,transform] hover:bg-accent hover:text-accent-foreground hover:translate-x-[2px] focus-visible:ring-2 active:bg-accent active:text-accent-foreground disabled:pointer-events-none disabled:opacity-50 group-has-data-[sidebar=menu-action]/menu-item:pr-8 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[active=true]:bg-primary data-[active=true]:text-primary-foreground data-[active=true]:font-bold data-[active=true]:border-2 data-[active=true]:border-border data-[active=true]:shadow-neo-sm data-[state=open]:hover:bg-accent data-[state=open]:hover:text-accent-foreground group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-2! [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0 group-data-[collapsible=icon]:justify-center'

  const variantClasses = {
    default: 'hover:bg-accent hover:text-accent-foreground',
    outline: 'bg-background shadow-[0_0_0_2px_hsl(var(--sidebar-border))] hover:bg-accent hover:text-accent-foreground hover:shadow-[0_0_0_2px_hsl(var(--sidebar-accent))]'
  }

  const sizeClasses = {
    default: 'h-8 text-sm',
    sm: 'h-7 text-xs',
    lg: 'h-12 text-sm group-data-[collapsible=icon]:p-0!'
  }
</script>

{#if tooltip && sidebar.state === 'collapsed' && !sidebar.isMobile}
  <Tooltip.Root>
    <Tooltip.Trigger>
      {#snippet child({ props })}
        <button
          data-slot="sidebar-menu-button"
          data-sidebar="menu-button"
          data-size={size}
          data-active={isActive}
          class={cn(baseClass, variantClasses[variant], sizeClasses[size], className)}
          {...props}
          {...restProps}
        >
          {@render children?.()}
        </button>
      {/snippet}
    </Tooltip.Trigger>
    <Tooltip.Portal>
      <Tooltip.Content
        side="right"
        align="center"
        class="bg-primary text-primary-foreground z-50 rounded-md px-3 py-1.5 text-xs"
      >
        {tooltip}
      </Tooltip.Content>
    </Tooltip.Portal>
  </Tooltip.Root>
{:else}
  <button
    data-slot="sidebar-menu-button"
    data-sidebar="menu-button"
    data-size={size}
    data-active={isActive}
    class={cn(baseClass, variantClasses[variant], sizeClasses[size], className)}
    {...restProps}
  >
    {@render children?.()}
  </button>
{/if}
