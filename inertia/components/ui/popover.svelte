<script lang="ts" module>
  export {
    default as Popover,
    default as Root
  } from './popover.svelte'
  export { default as PopoverTrigger, default as Trigger } from './popover_trigger.svelte'
  export { default as PopoverContent, default as Content } from './popover_content.svelte'
</script>

<script lang="ts">
  import { Popover as PopoverPrimitive, type PopoverRootProps } from 'bits-ui'

  type Props = PopoverRootProps

  const props: Props = $props()
  const children = $derived(props.children)
  const restProps = $derived.by(() => {
    const { children: _children, ...rest } = props
    return rest
  })
</script>

<PopoverPrimitive.Root {...restProps}>
  {@render children?.()}
</PopoverPrimitive.Root>
