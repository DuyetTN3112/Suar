<script lang="ts">
  import type { HTMLAttributes } from "svelte/elements"

  import { cn } from "$lib/utils-svelte"
  type Props = HTMLAttributes<HTMLImageElement> & { class?: string; src?: string; alt?: string }
  const { class: className, src = "", alt = "", ...restProps }: Props = $props()
</script>

<img {src} {alt} class={cn("aspect-square h-full w-full", className)} {...restProps} />
