<script lang="ts">
  import DropdownMenu from '../../../inertia/components/ui/dropdown_menu.svelte'
  import DropdownMenuContent from '../../../inertia/components/ui/dropdown_menu_content.svelte'
  import DropdownMenuSub from '../../../inertia/components/ui/dropdown_menu_sub.svelte'
  import DropdownMenuSubContent from '../../../inertia/components/ui/dropdown_menu_sub_content.svelte'
  interface Props { text?: string; class?: string; value?: string }
  let { text = 'DropdownMenuSubContent', class: cls, value = 'opt1' }: Props = $props()
</script>
<div class={cls}>
  <DropdownMenu open={true}>
    <DropdownMenuContent>
      <DropdownMenuSub open={true}>
        <DropdownMenuSubContent>{text}</DropdownMenuSubContent>
      </DropdownMenuSub>
    </DropdownMenuContent>
  </DropdownMenu>
</div>