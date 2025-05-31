<script lang="ts" module>
  import { Popover as PopoverPrimitive } from 'bits-ui'

  export {
    default as Popover,
    default as Root
  } from './popover.svelte'
  export { default as PopoverTrigger, default as Trigger } from './popover_trigger.svelte'
  export { default as PopoverContent, default as Content } from './popover_content.svelte'
</script>

<script lang="ts">
  import type { Snippet } from 'svelte'
  import type { ComponentProps } from 'bits-ui'

  type Props = ComponentProps<typeof PopoverPrimitive.Root>

  const {
    children,
    ...restProps
  }: Props & { children?: Snippet } = $props()
</script>

<PopoverPrimitive.Root {...restProps}>
  {@render children?.()}
</PopoverPrimitive.Root>
