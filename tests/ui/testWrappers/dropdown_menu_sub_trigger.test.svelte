<script lang="ts">
  import DropdownMenu from '../../../inertia/components/ui/dropdown_menu.svelte'
  import DropdownMenuContent from '../../../inertia/components/ui/dropdown_menu_content.svelte'
  import DropdownMenuSub from '../../../inertia/components/ui/dropdown_menu_sub.svelte'
  import DropdownMenuSubTrigger from '../../../inertia/components/ui/dropdown_menu_sub_trigger.svelte'
  interface Props { text?: string; class?: string; value?: string }
  let { text = 'DropdownMenuSubTrigger', class: cls, value = 'opt1' }: Props = $props()
</script>
<div class={cls}>
  <DropdownMenu open={true}>
    <DropdownMenuContent>
      <DropdownMenuSub>
        <DropdownMenuSubTrigger>{text}</DropdownMenuSubTrigger>
      </DropdownMenuSub>
    </DropdownMenuContent>
  </DropdownMenu>
</div>