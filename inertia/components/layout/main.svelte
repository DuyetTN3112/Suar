<script lang="ts">
  import { cn } from '$lib/utils-svelte'
  import type { Snippet } from 'svelte'

  interface MainProps {
    class?: string
    fixed?: boolean
    children?: Snippet
  }

  const { class: className, fixed = false, children }: MainProps = $props()
</script>

<main
  class={cn(
    'peer-[.header-fixed]/header:mt-16',
    'px-4 py-6',
    fixed && 'fixed-main flex grow flex-col overflow-hidden',
    className
  )}
>
  {#if children}
    {@render children()}
  {/if}
</main>
