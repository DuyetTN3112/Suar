<script lang="ts">
  import DropdownMenu from '../../../inertia/components/ui/dropdown_menu.svelte'
  import DropdownMenuShortcut from '../../../inertia/components/ui/dropdown_menu_shortcut.svelte'
  interface Props { text?: string; class?: string; value?: string }
  let { text = 'DropdownMenuShortcut', class: cls, value = 'opt1' }: Props = $props()
</script>
<DropdownMenu><DropdownMenuShortcut class={cls}>{text}</DropdownMenuShortcut></DropdownMenu>