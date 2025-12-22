<script lang="ts">
  import { cn } from "$lib/utils-svelte"
  const { class: className, ...restProps } = $props<{ class?: string }>()
</script>

<div class={cn("animate-pulse rounded-lg bg-muted", className)} {...restProps}></div>
