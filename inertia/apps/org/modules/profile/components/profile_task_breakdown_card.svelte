<script lang="ts">
  interface Props {
    taskBreakdown: {
      completed: number
      onTime: number
      late: number
      ongoing: number
    }
    t: (key: string, params?: Record<string, unknown>, fallback?: string) => string
  }

  const { taskBreakdown, t }: Props = $props()
</script>

<div class="rounded-2xl border border-border bg-card p-4 shadow-suar-xs">
  <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
    {t('user.profile_overview.task_breakdown', {}, 'Task breakdown')}
  </p>
  {#if taskBreakdown.completed > 0}
    {@const total = Math.max(taskBreakdown.completed, 1)}
    {@const onTimePct = (taskBreakdown.onTime / total) * 100}
    {@const latePct = (taskBreakdown.late / total) * 100}
    {@const ongoingPct = (taskBreakdown.ongoing / total) * 100}
    <div class="mt-4 flex h-3.5 overflow-hidden rounded-full bg-secondary/50 p-0.5 shadow-inner">
      {#if onTimePct > 0}
        <div class="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 shadow-[0_0_10px_rgba(52,211,153,0.4)] transition-all duration-1000 ease-out" style="width: {onTimePct}%"></div>
      {/if}
      {#if ongoingPct > 0}
        <div class="h-full rounded-full bg-gradient-to-r from-blue-400 to-indigo-500 shadow-[0_0_10px_rgba(96,165,250,0.4)] transition-all duration-1000 ease-out" style="width: {ongoingPct}%"></div>
      {/if}
      {#if latePct > 0}
        <div class="h-full rounded-full bg-gradient-to-r from-rose-400 to-orange-500 shadow-[0_0_10px_rgba(251,113,133,0.4)] transition-all duration-1000 ease-out" style="width: {latePct}%"></div>
      {/if}
    </div>
    <div class="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-[11px] font-bold text-muted-foreground">
      <span class="flex items-center gap-1.5"><span class="inline-block h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]"></span>{t('user.profile_overview.on_time', {}, 'On time')}: <span class="text-foreground">{taskBreakdown.onTime}</span></span>
      <span class="flex items-center gap-1.5"><span class="inline-block h-2.5 w-2.5 rounded-full bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.6)]"></span>{t('user.profile_overview.ongoing', {}, 'In progress')}: <span class="text-foreground">{taskBreakdown.ongoing}</span></span>
      <span class="flex items-center gap-1.5"><span class="inline-block h-2.5 w-2.5 rounded-full bg-rose-400 shadow-[0_0_6px_rgba(251,113,133,0.6)]"></span>{t('user.profile_overview.late', {}, 'Late')}: <span class="text-foreground">{taskBreakdown.late}</span></span>
    </div>
  {:else}
    <p class="mt-3 text-xs text-muted-foreground">{t('user.profile_overview.no_task_data', {}, 'No task data yet.')}</p>
  {/if}
</div>
