<script lang="ts">
  import ModeToggle from '../../../inertia/components/ui/mode_toggle.svelte'
  interface Props { text?: string; class?: string }
  let { text = 'Test', class: cls }: Props = $props()
</script>
<div class={cls}>
  <ModeToggle>{text}</ModeToggle>
</div>