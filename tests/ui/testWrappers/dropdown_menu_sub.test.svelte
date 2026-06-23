<script lang="ts">
  import DropdownMenu from '../../../inertia/components/ui/dropdown_menu.svelte'
  import DropdownMenuContent from '../../../inertia/components/ui/dropdown_menu_content.svelte'
  import DropdownMenuSub from '../../../inertia/components/ui/dropdown_menu_sub.svelte'
  interface Props { text?: string; class?: string; value?: string }
  let { text = 'DropdownMenuSub', class: cls, value = 'opt1' }: Props = $props()
</script>
<div class={cls}>
  <DropdownMenu open={true}>
    <DropdownMenuContent>
      <DropdownMenuSub>{text}</DropdownMenuSub>
    </DropdownMenuContent>
  </DropdownMenu>
</div>