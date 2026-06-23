<script lang="ts">
  import DropdownMenu from '../../../inertia/components/ui/dropdown_menu.svelte'
  import DropdownMenuTrigger from '../../../inertia/components/ui/dropdown_menu_trigger.svelte'
  interface Props { text?: string; class?: string; value?: string }
  let { text = 'DropdownMenuTrigger', class: cls, value = 'opt1' }: Props = $props()
</script>
<DropdownMenu><DropdownMenuTrigger class={cls}>{text}</DropdownMenuTrigger></DropdownMenu>