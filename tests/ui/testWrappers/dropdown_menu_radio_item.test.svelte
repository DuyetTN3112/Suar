<script lang="ts">
  import DropdownMenu from '../../../inertia/components/ui/dropdown_menu.svelte'
  import DropdownMenuContent from '../../../inertia/components/ui/dropdown_menu_content.svelte'
  import DropdownMenuRadioGroup from '../../../inertia/components/ui/dropdown_menu_radio_group.svelte'
  import DropdownMenuRadioItem from '../../../inertia/components/ui/dropdown_menu_radio_item.svelte'
  interface Props { text?: string; class?: string; value?: string }
  let { text = 'DropdownMenuRadioItem', class: cls, value = 'opt1' }: Props = $props()
</script>
<div class={cls}>
  <DropdownMenu open={true}>
    <DropdownMenuContent>
      <DropdownMenuRadioGroup {value}>
        <DropdownMenuRadioItem {value}>{text}</DropdownMenuRadioItem>
      </DropdownMenuRadioGroup>
    </DropdownMenuContent>
  </DropdownMenu>
</div>