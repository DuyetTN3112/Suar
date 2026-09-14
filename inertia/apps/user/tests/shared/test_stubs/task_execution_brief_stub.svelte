<script lang="ts">
  let { onReloadBrief } = $props<{ onReloadBrief?: () => void }>()
</script>

{#if onReloadBrief}
  <button type="button" onclick={onReloadBrief}>Reload brief</button>
{/if}
