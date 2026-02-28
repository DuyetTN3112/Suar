<script lang="ts">
  interface Props {
    label?: string
  }

  const { label }: Props = $props()
</script>

{#if label}
  <div
    class="text-[11px] inline-flex items-center whitespace-nowrap font-medium"
  >
    <span
      class="h-1.5 w-1.5 rounded-full mr-1"
    ></span>
    {label}
  </div>
{:else}
  <span class="text-[11px] text-muted-foreground">-</span>
{/if}
