<!--
  AvatarFallback Component - Svelte 5
-->

<script lang="ts">
  import { cn } from '$lib/utils-svelte'
  import { Avatar as AvatarPrimitive } from 'bits-ui'
  import type { HTMLAttributes } from 'svelte/elements'

  type Props = HTMLAttributes<HTMLSpanElement> & {
    class?: string
  }

  const { class: className, children, ...restProps }: Props = $props()
</script>

<AvatarPrimitive.Fallback
  data-slot="avatar-fallback"
  class={cn(
    'bg-muted flex size-full items-center justify-center rounded-full',
    className
  )}
  {...restProps}
>
  {@render children?.()}
</AvatarPrimitive.Fallback>
