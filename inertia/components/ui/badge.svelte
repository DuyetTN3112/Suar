<!--
  Badge Component - Svelte 5

  Port từ shadcn/ui React badge.
-->

<script lang="ts" module>
  import { tv, type VariantProps } from 'tailwind-variants'

  export const badgeVariants = tv({
    base: 'inline-flex items-center justify-center rounded-md border-2 border-border px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider shadow-neo-sm w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden',
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground [a&]:hover:bg-primary/90',
        secondary:
          'bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90',
        destructive:
          'bg-destructive text-white [a&]:hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60',
        outline:
          'text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  })

  export type BadgeVariants = VariantProps<typeof badgeVariants>
</script>

<script lang="ts">
  import { cn } from '$lib/utils-svelte'
  import type { HTMLAttributes } from 'svelte/elements'

  type Props = HTMLAttributes<HTMLSpanElement> & BadgeVariants & {
    class?: string
  }

  const {
    class: className,
    variant = 'default',
    children,
    ...restProps
  }: Props = $props()
</script>

<span
  data-slot="badge"
  class={cn(badgeVariants({ variant }), className)}
  {...restProps}
>
  {@render children?.()}
</span>
