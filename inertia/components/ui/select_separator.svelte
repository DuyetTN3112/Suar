<!--
  SelectSeparator Component - Svelte 5
-->

<script lang="ts">
  import { cn } from '$lib/utils-svelte'

  interface Props {
    class?: string
  }

  const { class: className, ...restProps }: Props = $props()
</script>

<div
  data-slot="select-separator"
  class={cn('bg-border pointer-events-none -mx-1 my-1 h-px', className)}
  {...restProps}
></div>
