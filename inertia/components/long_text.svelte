<script lang="ts">
  import { cn } from '$lib/utils-svelte'
  import Popover from '@/components/ui/popover.svelte'
  import PopoverTrigger from '@/components/ui/popover_trigger.svelte'
  import PopoverContent from '@/components/ui/popover_content.svelte'
  import Tooltip from '@/components/ui/tooltip.svelte'
  import TooltipTrigger from '@/components/ui/tooltip_trigger.svelte'
  import TooltipContent from '@/components/ui/tooltip_content.svelte'
  import type { Snippet } from 'svelte'

  type Props = {
    children: Snippet
    class?: string
    contentClass?: string
  }

  const {
    children,
    class: className = '',
    contentClass = ''
  }: Props = $props()

  let ref = $state<HTMLDivElement | null>(null)
  let isOverflown = $state(false)

  function checkOverflow(textContainer: HTMLDivElement | null): boolean {
    if (textContainer) {
      return (
        textContainer.offsetHeight < textContainer.scrollHeight ||
        textContainer.offsetWidth < textContainer.scrollWidth
      )
    }
    return false
  }

  $effect(() => {
    if (ref !== null) {
      isOverflown = checkOverflow(ref)
    }
  })
</script>

{#if !isOverflown}
  <div bind:this={ref} class={cn('truncate', className)}>
    {@render children()}
  </div>
{:else}
  <!-- Desktop: Tooltip -->
  <div class="hidden sm:block">
    <Tooltip>
      <TooltipTrigger>
        <div bind:this={ref} class={cn('truncate', className)}>
          {@render children()}
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p class={contentClass}>{@render children()}</p>
      </TooltipContent>
    </Tooltip>
  </div>

  <!-- Mobile: Popover -->
  <div class="sm:hidden">
    <Popover>
      <PopoverTrigger>
        <div bind:this={ref} class={cn('truncate', className)}>
          {@render children()}
        </div>
      </PopoverTrigger>
      <PopoverContent class={cn('w-fit', contentClass)}>
        <p>{@render children()}</p>
      </PopoverContent>
    </Popover>
  </div>
{/if}
