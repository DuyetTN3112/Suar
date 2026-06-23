<script lang="ts">
  import DropdownMenu from '../../../inertia/components/ui/dropdown_menu.svelte'
  import DropdownMenuContent from '../../../inertia/components/ui/dropdown_menu_content.svelte'
  import DropdownMenuCheckboxItem from '../../../inertia/components/ui/dropdown_menu_checkbox_item.svelte'
  interface Props { text?: string; class?: string; value?: string }
  let { text = 'DropdownMenuCheckboxItem', class: cls, value = 'opt1' }: Props = $props()
</script>
<div class={cls}>
  <DropdownMenu open={true}>
    <DropdownMenuContent>
      <DropdownMenuCheckboxItem>{text}</DropdownMenuCheckboxItem>
    </DropdownMenuContent>
  </DropdownMenu>
</div>