<script lang="ts">
  import DropdownMenu from '../../../inertia/components/ui/dropdown_menu.svelte'
  import DropdownMenuContent from '../../../inertia/components/ui/dropdown_menu_content.svelte'
  interface Props { text?: string; class?: string; value?: string }
  let { text = 'DropdownMenuContent', class: cls, value = 'opt1' }: Props = $props()
</script>
<div class={cls}>
  <DropdownMenu open={true}>
    <DropdownMenuContent>{text}</DropdownMenuContent>
  </DropdownMenu>
</div>