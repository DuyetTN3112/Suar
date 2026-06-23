<script lang="ts">
  import DropdownMenu from '../../../inertia/components/ui/dropdown_menu.svelte'
  import DropdownMenuGroup from '../../../inertia/components/ui/dropdown_menu_group.svelte'
  interface Props { text?: string; class?: string; value?: string }
  let { text = 'DropdownMenuGroup', class: cls, value = 'opt1' }: Props = $props()
</script>
<DropdownMenu><DropdownMenuGroup class={cls}>{text}</DropdownMenuGroup></DropdownMenu>