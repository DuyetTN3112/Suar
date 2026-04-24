<script lang="ts">
  import type { Snippet } from "svelte"
  import type { HTMLAttributes } from "svelte/elements"

  import { cn } from "$lib/utils-svelte"
  type Props = HTMLAttributes<HTMLDivElement> & { class?: string; children?: Snippet }
  const { class: className, children, ...restProps }: Props = $props()
</script>

<div role="alert" class={cn("relative w-full rounded-lg border border-border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground", className)} {...restProps}>
  {@render children?.()}
</div>

<script lang="ts" module>
  export const alertVariants = {}
</script>
