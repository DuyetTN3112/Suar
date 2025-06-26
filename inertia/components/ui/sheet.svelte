<script lang="ts" module>
  import { Dialog as DialogPrimitive } from 'bits-ui'

  export {
    default as Sheet,
    default as Root
  } from './sheet.svelte'
  export { default as SheetTrigger, default as Trigger } from './sheet_trigger.svelte'
  export { default as SheetClose, default as Close } from './sheet_close.svelte'
  export { default as SheetContent, default as Content } from './sheet_content.svelte'
  export { default as SheetHeader, default as Header } from './sheet_header.svelte'
  export { default as SheetFooter, default as Footer } from './sheet_footer.svelte'
  export { default as SheetTitle, default as Title } from './sheet_title.svelte'
  export { default as SheetDescription, default as Description } from './sheet_description.svelte'
  export const SheetPortal = DialogPrimitive.Portal
</script>

<script lang="ts">
  import { Dialog as SheetPrimitive, type DialogRootProps } from 'bits-ui'

  type Props = DialogRootProps

  const props: Props = $props()
  const children = $derived(props.children)
  const restProps = $derived.by(() => {
    const { children: _children, ...rest } = props
    return rest
  })
</script>

<SheetPrimitive.Root {...restProps}>
  {@render children?.()}
</SheetPrimitive.Root>
