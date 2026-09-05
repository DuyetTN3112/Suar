<script lang="ts">
  import { Bell, BellOff, CirclePause } from 'lucide-svelte'

  interface Props {
    status: 'disabled' | 'active' | 'paused'
    reason?: string | null
  }

  let { status, reason = null }: Props = $props()

  const labels = {
    disabled: 'Alerts off',
    active: 'Alerts on',
    paused: 'Alerts paused',
  } as const
</script>

<span
  role="status"
  title={reason ?? undefined}
  class={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[11px] font-semibold ${
    status === 'active'
      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700'
      : status === 'paused'
        ? 'border-amber-500/30 bg-amber-500/10 text-amber-700'
        : 'border-border bg-muted/30 text-muted-foreground'
  }`}
>
  {#if status === 'active'}
    <Bell class="size-3.5" aria-hidden="true" />
  {:else if status === 'paused'}
    <CirclePause class="size-3.5" aria-hidden="true" />
  {:else}
    <BellOff class="size-3.5" aria-hidden="true" />
  {/if}
  <span>{labels[status]}</span>
</span>
