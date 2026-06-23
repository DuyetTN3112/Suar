<script lang="ts">
  import DropdownMenu from '../../../inertia/components/ui/dropdown_menu.svelte'
  import DropdownMenuLabel from '../../../inertia/components/ui/dropdown_menu_label.svelte'
  interface Props { text?: string; class?: string; value?: string }
  let { text = 'DropdownMenuLabel', class: cls, value = 'opt1' }: Props = $props()
</script>
<DropdownMenu><DropdownMenuLabel class={cls}>{text}</DropdownMenuLabel></DropdownMenu>