<script lang="ts">
  interface Props {
    label?: {
      name?: string
      color?: string
    }
  }

  const { label }: Props = $props()
</script>

{#if label}
  <div
    class="text-[11px] inline-flex items-center whitespace-nowrap font-medium"
    style:color={label?.color || 'currentColor'}
  >
    <span
      class="h-1.5 w-1.5 rounded-full mr-1"
      style:background-color={label?.color || 'currentColor'}
    ></span>
    {label?.name}
  </div>
{:else}
  <span class="text-[11px] text-muted-foreground">-</span>
{/if}
