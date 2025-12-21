<script lang="ts">
  import { RadioGroup as RadioGroupPrimitive } from 'bits-ui'
  import type { ComponentProps, Snippet } from 'svelte'

  import { cn } from '$lib/utils-svelte'

  type Props = ComponentProps<typeof RadioGroupPrimitive.Root> & {
    class?: string
    children?: Snippet
  }

  let { class: className, value = $bindable(''), children, ...restProps }: Props = $props()
</script>

<RadioGroupPrimitive.Root bind:value class={cn('grid gap-2', className)} {...restProps}>
  {@render children?.()}
</RadioGroupPrimitive.Root>
