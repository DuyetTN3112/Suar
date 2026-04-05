<!--
  Button Component - Svelte 5 + shadcn-svelte

  Port từ shadcn/ui React button.
  Sử dụng Tailwind Variants cho styling.
-->

<script lang="ts">
  import { cn } from '$lib/utils-svelte'
  import type { HTMLButtonAttributes } from 'svelte/elements'
  import { buttonVariants } from './button_variants'
  import type { ButtonVariants } from './button_variants'

  type Props = HTMLButtonAttributes &
    ButtonVariants & {
    class?: string
  }

  const {
    class: className,
    variant = 'default',
    size = 'default',
    children,
    ...restProps
  }: Props = $props()
</script>

<button
  class={cn(buttonVariants({ variant, size }), className)}
  {...restProps}
>
  {@render children?.()}
</button>
