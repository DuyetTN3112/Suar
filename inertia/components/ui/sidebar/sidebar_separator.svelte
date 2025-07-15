<script lang="ts">
  import { cn } from '$lib/utils-svelte'

  import Separator from '../separator.svelte'

  interface Props {
    class?: string
    [key: string]: unknown
  }

  const { class: className, ...restProps }: Props = $props()
</script>

<Separator
  data-slot="sidebar-separator"
  data-sidebar="separator"
  class={cn('bg-sidebar-border mx-2 w-auto', className)}
  {...restProps}
/>
