<script lang="ts">
  import ThemeSwitch from '../../../inertia/components/theme-switch.svelte'
  interface Props { class?: string; text?: string }
  let { class: cls, text = 'Test' }: Props = $props()
</script>
<div class={cls}>
  <ThemeSwitch>{text}</ThemeSwitch>
</div>