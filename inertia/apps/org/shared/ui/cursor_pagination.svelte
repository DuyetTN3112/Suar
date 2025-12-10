<script lang="ts">
  import type { HTMLAttributes } from 'svelte/elements'

  import { cn } from '$lib/utils-svelte'
  import { useTranslation } from '@/apps/org/shared/stores/translation.svelte'

  type Props = HTMLAttributes<HTMLElement> & {
    class?: string
    hasPreviousPage: boolean
    hasNextPage: boolean
    newerHref?: string | null
    newestHref?: string | null
    olderHref?: string | null
    onLoadNewer?: () => void
    onLoadNewest?: () => void
    onLoadOlder?: () => void
    showNewestShortcut?: boolean
    summary?: string
  }

  const {
    class: className,
    hasPreviousPage,
    hasNextPage,
    newerHref = null,
    newestHref = null,
    olderHref = null,
    onLoadNewer,
    onLoadNewest,
    onLoadOlder,
    showNewestShortcut = false,
    summary,
    ...restProps
  }: Props = $props()

  const rootClass = 'flex flex-col gap-3 pt-4 sm:flex-row sm:items-center sm:justify-between'
  const controlsClass = 'flex flex-wrap gap-2 sm:justify-end'
  const itemClass =
    'inline-flex min-w-9 items-center justify-center rounded-md border border-border px-3 py-2 text-sm font-medium transition-colors'
  const idleClass = 'bg-background text-foreground hover:bg-accent'
  const disabledClass = 'pointer-events-none opacity-50 bg-background text-foreground'
  const { t } = useTranslation()

  function renderHrefOrButton(
    href: string | null,
    handler: (() => void) | undefined,
    disabled: boolean
  ) {
    return {
      href,
      handler,
      disabled,
    }
  }
</script>

{#snippet renderControl(
  item: ReturnType<typeof renderHrefOrButton>,
  label: string,
  ariaLabel: string
)}
  {#if item.href}
    <a
      href={item.href}
      aria-label={ariaLabel}
      aria-disabled={item.disabled}
      tabindex={item.disabled ? -1 : undefined}
      class={cn(itemClass, item.disabled ? disabledClass : idleClass)}
    >
      {label}
    </a>
  {:else}
    <button
      type="button"
      aria-label={ariaLabel}
      class={cn(itemClass, item.disabled ? disabledClass : idleClass)}
      disabled={item.disabled}
      onclick={() => {
        item.handler?.()
      }}
    >
      {label}
    </button>
  {/if}
{/snippet}

<div class={cn(rootClass, className)} {...restProps}>
  {#if summary}
    <span class="text-sm text-muted-foreground">{summary}</span>
  {/if}

  <div class={controlsClass}>
    {#if true}
      {@const newerControl = renderHrefOrButton(
        newerHref ?? newestHref,
        onLoadNewer ?? onLoadNewest,
        !hasPreviousPage
      )}
      {@render renderControl(newerControl, t('common.newer', {}, 'Newer'), t('common.newer', {}, 'Newer'))}
    {/if}

    {#if showNewestShortcut && hasPreviousPage && (newestHref || onLoadNewest)}
      {@const newestControl = renderHrefOrButton(newestHref, onLoadNewest, false)}
      {@render renderControl(newestControl, t('common.newest', {}, 'Newest'), t('common.newest', {}, 'Newest'))}
    {/if}

    {#if true}
      {@const olderControl = renderHrefOrButton(olderHref, onLoadOlder, !hasNextPage)}
      {@render renderControl(olderControl, t('common.older', {}, 'Older'), t('common.older', {}, 'Older'))}
    {/if}
  </div>
</div>
