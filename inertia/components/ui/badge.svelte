<script lang="ts" module>
  import { tv, type VariantProps } from "tailwind-variants"
  export const badgeVariants = tv({
    base: [
      "inline-flex items-center justify-center gap-1",
      "rounded-md border px-2.5 py-0.5",
      "font-mono text-[0.6875rem] font-black tracking-[0.08em] uppercase",
      "w-fit whitespace-nowrap shrink-0",
      "transition-colors",
    ],
    variants: {
      variant: {
        /* Orange accent — primary status, active */
        default:     "border-black/15 bg-primary text-primary-foreground",
        /* Subtle neutral */
        secondary:   "border-border bg-secondary text-secondary-foreground",
        /* Strong — completed, success, rejected */
        destructive: "border-black bg-black text-white",
        /* Hollow */
        outline:     "border-border bg-transparent text-foreground hover:bg-secondary",
        /* Pending / in-progress — dashed orange border */
        pending:     "border-dashed border-black/30 bg-transparent text-foreground",
        /* Warning — orange tint surface */
        warning:     "border-orange/40 bg-orange-06 text-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  })
  export type BadgeVariants = VariantProps<typeof badgeVariants>
</script>

<script lang="ts">
  import type { HTMLAttributes } from "svelte/elements"

  import { cn } from "$lib/utils-svelte"

  type Props = HTMLAttributes<HTMLSpanElement> & {
    variant?: BadgeVariants["variant"]
    class?: string
  }

  const { class: className, variant = "default", children, ...restProps }: Props = $props()
</script>

<span
  data-slot="badge"
  class={cn(badgeVariants({ variant }), className)}
  {...restProps}
>
  {@render children?.()}
</span>
