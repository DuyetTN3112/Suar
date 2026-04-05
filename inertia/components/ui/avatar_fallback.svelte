<!--
  AvatarFallback Component - Svelte 5
-->

<script lang="ts">
  import { cn } from '$lib/utils-svelte'
  import { Avatar as AvatarPrimitive, type AvatarFallbackProps } from 'bits-ui'

  type Props = AvatarFallbackProps & {
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
