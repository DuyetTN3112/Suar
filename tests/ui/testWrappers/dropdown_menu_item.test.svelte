<script lang="ts">
  import DropdownMenu from '../../../inertia/components/ui/dropdown_menu.svelte'
  import DropdownMenuContent from '../../../inertia/components/ui/dropdown_menu_content.svelte'
  import DropdownMenuItem from '../../../inertia/components/ui/dropdown_menu_item.svelte'
  interface Props { text?: string; class?: string; value?: string }
  let { text = 'DropdownMenuItem', class: cls, value = 'opt1' }: Props = $props()
</script>
<div class={cls}>
  <DropdownMenu open={true}>
    <DropdownMenuContent>
      <DropdownMenuItem>{text}</DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</div>