<script lang="ts">
  import DropdownMenu from '../../../inertia/components/ui/dropdown_menu.svelte'
  import DropdownMenuSeparator from '../../../inertia/components/ui/dropdown_menu_separator.svelte'
  interface Props { text?: string; class?: string; value?: string }
  let { text = 'DropdownMenuSeparator', class: cls, value = 'opt1' }: Props = $props()
</script>
<DropdownMenu><DropdownMenuSeparator class={cls}>{text}</DropdownMenuSeparator></DropdownMenu>