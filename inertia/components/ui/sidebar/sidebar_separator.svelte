<script lang="ts">
  import { cn } from '$lib/utils-svelte'
  import Separator from '../separator.svelte'
  import type { HTMLAttributes } from 'svelte/elements'

  type Props = HTMLAttributes<HTMLDivElement> & {
    class?: string
  }

  const { class: className, ...restProps }: Props = $props()
</script>

<Separator
  data-slot="sidebar-separator"
  data-sidebar="separator"
  class={cn('bg-sidebar-border mx-2 w-auto', className)}
  {...restProps}
/>
