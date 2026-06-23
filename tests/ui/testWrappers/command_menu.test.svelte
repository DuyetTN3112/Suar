<script lang="ts">
  import CommandMenu from '../../../inertia/components/command_menu.svelte'
  interface Props { class?: string; text?: string }
  let { class: cls, text = 'Test' }: Props = $props()
</script>
<div class={cls}>
  <CommandMenu>{text}</CommandMenu>
</div>