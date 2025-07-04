<!--
  AvatarImage Component - Svelte 5
-->

<script lang="ts">
  import { cn } from '$lib/utils-svelte'
  import { Avatar as AvatarPrimitive, type AvatarImageProps } from 'bits-ui'

  type Props = AvatarImageProps & {
    class?: string
  }

  const { class: className, ...restProps }: Props = $props()
</script>

<AvatarPrimitive.Image
  data-slot="avatar-image"
  class={cn('aspect-square size-full', className)}
  {...restProps}
/>
