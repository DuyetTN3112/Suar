<!--
  Button Component - Svelte 5 + shadcn-svelte

  Port từ shadcn/ui React button.
  Sử dụng Tailwind Variants cho styling.
-->

<script lang="ts" module>
  import { tv, type VariantProps } from 'tailwind-variants'

  export const buttonVariants = tv({
    base: 'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  })

  export type ButtonVariants = VariantProps<typeof buttonVariants>
</script>

<script lang="ts">
  import { cn } from '$lib/utils-svelte'
  import type { HTMLButtonAttributes } from 'svelte/elements'

  type Props = HTMLButtonAttributes & ButtonVariants & {
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
