<script lang="ts">
  import { X } from 'lucide-svelte'

  import type { FilterAlertClientError, FilterAlertDto } from '../../alerts/filter_alert_client'

  interface Props {
    open: boolean
    alert: FilterAlertDto | null
    loading: boolean
    error: FilterAlertClientError | null
    onClose: () => void
    onCreate: (input: { intervalMinutes: number; timezone: string }) => Promise<FilterAlertDto>
    onPause: () => Promise<FilterAlertDto | null>
    onResume: () => Promise<FilterAlertDto | null>
    onSchedule: (input: { intervalMinutes: number; timezone: string }) => Promise<FilterAlertDto | null>
    onDelete: () => Promise<FilterAlertDto | null>
  }

  let {
    open,
    alert,
    loading,
    error,
    onClose,
    onCreate,
    onPause,
    onResume,
    onSchedule,
    onDelete,
  }: Props = $props()

  let intervalMinutes = $state('30')
  let timezone = $state('UTC')
  let localError = $state<string | null>(null)

  $effect(() => {
    if (alert) {
      intervalMinutes = String(alert.intervalMinutes)
      timezone = alert.timezone
    }
  })

  async function submitCreate() {
    await run(() => onCreate({ intervalMinutes: Number(intervalMinutes), timezone }))
  }

  async function submitSchedule() {
    await run(() => onSchedule({ intervalMinutes: Number(intervalMinutes), timezone }))
  }

  async function run(operation: () => Promise<unknown>) {
    localError = null
    try {
      await operation()
      onClose()
    } catch (cause) {
      localError = cause instanceof Error ? cause.message : 'Alert update failed'
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') onClose()
  }
</script>

{#if open}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
    role="dialog"
    aria-modal="true"
    aria-labelledby="filter-alert-dialog-title"
    tabindex="-1"
    onkeydown={handleKeydown}
  >
    <div class="w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-xl">
      <div class="flex items-center justify-between border-b border-border pb-4">
        <h2 id="filter-alert-dialog-title" class="text-lg font-black text-foreground">
          {alert ? 'Saved-view alerts' : 'Subscribe to alerts'}
        </h2>
        <button type="button" onclick={onClose} class="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Close alert dialog">
          <X class="size-5" aria-hidden="true" />
        </button>
      </div>

      <div class="mt-4 space-y-4">
        <p class="text-sm text-muted-foreground">
          Notifications are sent only after an exact evaluation. A degraded or approximate result pauses delivery.
        </p>

        <div>
          <label class="mb-1 block text-xs font-bold text-muted-foreground" for="filter-alert-interval">Interval (minutes)</label>
          <input id="filter-alert-interval" type="number" min="15" step="15" bind:value={intervalMinutes} class="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground" disabled={loading} />
        </div>

        <div>
          <label class="mb-1 block text-xs font-bold text-muted-foreground" for="filter-alert-timezone">Timezone</label>
          <input id="filter-alert-timezone" type="text" bind:value={timezone} class="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground" disabled={loading} />
        </div>

        {#if alert}
          <dl class="grid gap-2 rounded-xl border border-border bg-muted/20 p-3 text-xs">
            <div class="flex justify-between gap-4">
              <dt class="font-semibold text-muted-foreground">Next run</dt>
              <dd class="text-right font-mono text-foreground">{alert.nextRunAt}</dd>
            </div>
            <div class="flex justify-between gap-4">
              <dt class="font-semibold text-muted-foreground">Last successful evaluation</dt>
              <dd class="text-right font-mono text-foreground">{alert.lastSuccessfulAt ?? 'None yet'}</dd>
            </div>
            {#if alert.pauseReason}
              <div class="flex justify-between gap-4">
                <dt class="font-semibold text-muted-foreground">Pause reason</dt>
                <dd class="text-right font-mono text-amber-700">{alert.pauseReason}</dd>
              </div>
            {/if}
          </dl>
        {/if}

        {#if error || localError}
          <div role="alert" class="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs font-semibold text-red-800">
            {localError ?? error?.message}
          </div>
        {/if}
      </div>

      <div class="mt-6 flex flex-wrap justify-end gap-2 border-t border-border pt-4">
        {#if alert}
          <button type="button" class="mr-auto rounded-xl border border-red-500/30 px-3 py-2 text-sm font-bold text-red-700 hover:bg-red-500/10" disabled={loading} onclick={() => run(onDelete)}>Delete alert</button>
          {#if alert.status === 'active'}
            <button type="button" class="rounded-xl border border-border px-3 py-2 text-sm font-bold text-muted-foreground hover:text-foreground" disabled={loading} onclick={() => run(onPause)}>Pause alerts</button>
          {:else}
            <button type="button" class="rounded-xl border border-border px-3 py-2 text-sm font-bold text-muted-foreground hover:text-foreground" disabled={loading} onclick={() => run(onResume)}>Resume alerts</button>
          {/if}
          <button type="button" class="rounded-xl bg-foreground px-4 py-2 text-sm font-bold text-background hover:bg-foreground/90 disabled:opacity-50" disabled={loading} onclick={submitSchedule}>{loading ? 'Saving…' : 'Save schedule'}</button>
        {:else}
          <button type="button" class="rounded-xl border border-border px-4 py-2 text-sm font-bold text-muted-foreground hover:text-foreground" disabled={loading} onclick={onClose}>Cancel</button>
          <button type="button" class="rounded-xl bg-foreground px-4 py-2 text-sm font-bold text-background hover:bg-foreground/90 disabled:opacity-50" disabled={loading} onclick={submitCreate}>{loading ? 'Subscribing…' : 'Subscribe to alerts'}</button>
        {/if}
      </div>
    </div>
  </div>
{/if}
