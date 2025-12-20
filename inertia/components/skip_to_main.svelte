<script lang="ts">
  import { cn } from '$lib/utils-svelte'

  interface Props {
    class?: string
  }

  const { class: className = '' }: Props = $props()
</script>

<a
  class={cn(
    "bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring fixed left-44 z-999 -translate-y-52 px-4 py-2 text-sm font-medium whitespace-nowrap opacity-95 shadow-sm transition focus:translate-y-3 focus:transform focus-visible:ring-1",
    className
  )}
  href="#content"
>
  Skip to Main
</a>
