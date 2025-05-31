<!--
  DropdownMenu Component - Svelte 5

  Port từ shadcn/ui React dropdown-menu.
  Uses Bits UI DropdownMenu primitive.
-->

<script lang="ts" module>
  export { default as DropdownMenu } from './dropdown_menu.svelte'
  export { default as DropdownMenuTrigger } from './dropdown_menu_trigger.svelte'
  export { default as DropdownMenuContent } from './dropdown_menu_content.svelte'
  export { default as DropdownMenuItem } from './dropdown_menu_item.svelte'
  export { default as DropdownMenuCheckboxItem } from './dropdown_menu_checkbox_item.svelte'
  export { default as DropdownMenuRadioItem } from './dropdown_menu_radio_item.svelte'
  export { default as DropdownMenuLabel } from './dropdown_menu_label.svelte'
  export { default as DropdownMenuSeparator } from './dropdown_menu_separator.svelte'
  export { default as DropdownMenuShortcut } from './dropdown_menu_shortcut.svelte'
  export { default as DropdownMenuGroup } from './dropdown_menu_group.svelte'
  export { default as DropdownMenuSub } from './dropdown_menu_sub.svelte'
  export { default as DropdownMenuSubTrigger } from './dropdown_menu_sub_trigger.svelte'
  export { default as DropdownMenuSubContent } from './dropdown_menu_sub_content.svelte'
  export { default as DropdownMenuRadioGroup } from './dropdown_menu_radio_group.svelte'
</script>

<script lang="ts">
  import { DropdownMenu as DropdownMenuPrimitive } from 'bits-ui'
  import type { Snippet } from 'svelte'

  type Props = {
    open?: boolean
    onOpenChange?: (open: boolean) => void
    children?: Snippet
  }

  let {
    open = $bindable(false),
    onOpenChange,
    children,
    ...restProps
  }: Props = $props()
</script>

<DropdownMenuPrimitive.Root
  bind:open
  {onOpenChange}
  {...restProps}
>
  {@render children?.()}
</DropdownMenuPrimitive.Root>
