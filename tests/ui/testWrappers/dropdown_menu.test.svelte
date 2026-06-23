<script lang="ts">
  import DropdownMenu from '../../../inertia/components/ui/dropdown_menu.svelte'
  interface Props { text?: string; class?: string; value?: string }
  let { text = 'DropdownMenu', class: cls, value = 'opt1' }: Props = $props()
</script>
<div class={cls}>
  <DropdownMenu>{text}</DropdownMenu>
</div>