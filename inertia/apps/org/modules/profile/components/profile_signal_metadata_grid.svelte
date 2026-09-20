<script lang="ts">
  import type { SignalItem } from './profile_overview_helpers'

  interface Props {
    signalItems: SignalItem[]
  }

  const { signalItems }: Props = $props()
</script>

<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
  {#each signalItems as item (item.label)}
    <div class="rounded-2xl border border-border bg-card p-3 shadow-suar-xs">
      <p class="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
        <item.icon class="size-3.5" />
        {item.label}
      </p>
      <p class="mt-2 text-sm font-semibold text-foreground">{item.value}</p>
    </div>
  {/each}
</div>
