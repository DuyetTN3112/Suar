<!--
  Avatar Components - Svelte 5

  Port từ shadcn/ui React avatar.
  Uses Bits UI Avatar primitive.
-->

<script lang="ts" module>
  export { default as Avatar } from './avatar.svelte'
  export { default as AvatarImage } from './avatar_image.svelte'
  export { default as AvatarFallback } from './avatar_fallback.svelte'
</script>

<script lang="ts">
  import { Avatar as AvatarPrimitive, type AvatarRootProps } from 'bits-ui'

  import { cn } from '$lib/utils-svelte'

  type Props = AvatarRootProps & {
    class?: string
  }

  const { class: className, children, ...restProps }: Props = $props()
</script>

<AvatarPrimitive.Root
  data-slot="avatar"
  class={cn(
    'relative flex size-8 shrink-0 overflow-hidden rounded-full border-2 border-border',
    className
  )}
  {...restProps}
>
  {@render children?.()}
</AvatarPrimitive.Root>
