<script lang="ts">
  import NavigationProgress from '../../../inertia/components/navigation_progress.svelte'
  interface Props { class?: string; text?: string }
  let { class: cls, text = 'Test' }: Props = $props()
</script>
<div class={cls}>
  <NavigationProgress>{text}</NavigationProgress>
</div>