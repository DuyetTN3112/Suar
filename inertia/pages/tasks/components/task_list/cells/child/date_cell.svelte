<script lang="ts">
  import { Clock } from 'lucide-svelte'

  interface Props {
    createdAt?: string
    formatDate: (dateString: string) => string
  }

  const { createdAt, formatDate }: Props = $props()
</script>

<div class="flex items-center gap-1">
  <Clock class="h-3 w-3 text-muted-foreground flex-shrink-0" />
  {#if createdAt}
    <span class="text-[11px]">{formatDate(createdAt)}</span>
  {:else}
    <span class="text-[11px] text-muted-foreground">-</span>
  {/if}
</div>
