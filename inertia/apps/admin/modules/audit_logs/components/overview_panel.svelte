<script lang="ts">
  import { AlertTriangle, ArrowRight, BookOpenText, Database, Gauge, User } from 'lucide-svelte'

  import Badge from '@/apps/admin/shared/ui/badge.svelte'
  import Card from '@/apps/admin/shared/ui/card.svelte'
  import CardContent from '@/apps/admin/shared/ui/card_content.svelte'
  import CardHeader from '@/apps/admin/shared/ui/card_header.svelte'
  import CardTitle from '@/apps/admin/shared/ui/card_title.svelte'
  import type { CursorPagePagination } from '@/apps/admin/shared/lib/pagination'
  import type { AdminAuditLogConsoleRow, buildAdminAuditLogConsoleModel } from '@/apps/admin/modules/audit_logs/console_model'
  import { outcomeTone, severityTone } from '@/apps/admin/modules/audit_logs/console_view'
  import { useTranslation } from '@/apps/admin/shared/stores/translation.svelte'

  interface Props {
    consoleModel: ReturnType<typeof buildAdminAuditLogConsoleModel>
    pagination: CursorPagePagination
    selectedLog: AdminAuditLogConsoleRow | null
    onSelect: (logId: string) => void
  }

  const { consoleModel, pagination, selectedLog, onSelect }: Props = $props()
  const { t } = useTranslation()

  const failingWorkflows = $derived(consoleModel.failingWorkflows ?? [])
  const traceHotspots = $derived(consoleModel.traceHotspots ?? [])
  const slowestEvents = $derived(consoleModel.slowestEvents ?? [])
</script>

<div class="space-y-5">
  <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
    <Card class="border-border bg-card shadow-sm">
      <CardContent class="pt-5">
        <div class="flex items-center justify-between">
          <div>
            <div class="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              {t('task.admin_audit_logs.warning', {}, 'Warning')}
            </div>
            <div class="mt-2 font-['JetBrains_Mono'] text-2xl font-semibold text-amber-700 dark:text-amber-300">
              {consoleModel.summary.warningCount}
            </div>
          </div>
          <AlertTriangle class="h-5 w-5 text-amber-500" />
        </div>
      </CardContent>
    </Card>
    <Card class="border-border bg-card shadow-sm">
      <CardContent class="pt-5">
        <div class="flex items-center justify-between">
          <div>
            <div class="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              {t('task.admin_audit_logs.top_actor', {}, 'Top actor')}
            </div>
            <div class="mt-2 text-lg font-semibold text-foreground">{consoleModel.topActors[0]?.label ?? 'N/A'}</div>
          </div>
          <User class="h-5 w-5 text-muted-foreground" />
        </div>
      </CardContent>
    </Card>
    <Card class="border-border bg-card shadow-sm">
      <CardContent class="pt-5">
        <div class="flex items-center justify-between">
          <div>
            <div class="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              {t('task.admin_audit_logs.top_module', {}, 'Top module')}
            </div>
            <div class="mt-2 text-lg font-semibold text-foreground">{consoleModel.topModules[0]?.label ?? 'N/A'}</div>
          </div>
          <Database class="h-5 w-5 text-muted-foreground" />
        </div>
      </CardContent>
    </Card>
    <Card class="border-border bg-card shadow-sm">
      <CardContent class="pt-5">
        <div class="flex items-center justify-between">
          <div>
            <div class="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              {t('task.admin_audit_logs.load_mode', {}, 'Load mode')}
            </div>
            <div class="mt-2 text-lg font-semibold text-foreground">
              {pagination.hasPreviousPage
                ? t('admin_ui.audit_logs.cursor_window', {}, 'Cursor window')
                : t('admin_ui.audit_logs.newest_window', {}, 'Newest window')}
            </div>
          </div>
          <BookOpenText class="h-5 w-5 text-muted-foreground" />
        </div>
      </CardContent>
    </Card>
  </div>

  <div class="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
    <Card class="border-border bg-card shadow-sm">
      <CardHeader>
        <CardTitle class="text-lg">{t('task.admin_audit_logs.priority_events', {}, 'Priority events')}</CardTitle>
      </CardHeader>
      <CardContent class="space-y-3">
        {#if consoleModel.filteredRows.length === 0}
          <div class="rounded-2xl border border-dashed border-border bg-muted/40 px-4 py-8 text-center text-sm text-muted-foreground">
            {t('task.admin_audit_logs.no_events_after_pivot', {}, 'No events remain in the current window after pivoting.')}
          </div>
        {:else}
          {#each consoleModel.filteredRows.slice(0, 6) as log}
            <button
              type="button"
              class={`flex w-full items-start justify-between rounded-2xl border px-4 py-3 text-left transition-colors ${
                selectedLog?.id === log.id
                  ? 'border-foreground bg-foreground text-background shadow-sm'
                  : 'border-border bg-muted/40 text-foreground hover:bg-card'
              }`}
              onclick={() => onSelect(log.id)}
            >
              <div class="space-y-2">
                <div class="flex flex-wrap items-center gap-2">
                  <Badge class={severityTone(log.investigation.severity)}>{log.severityLabel}</Badge>
                  <Badge class={outcomeTone(log.investigation.outcome)}>{log.outcomeLabel}</Badge>
                  <Badge variant="outline" class={selectedLog?.id === log.id ? 'border-background/20 bg-background/10 text-background' : ''}>
                    {log.moduleLabel}
                  </Badge>
                </div>
                <div class="text-sm font-semibold">{log.investigation.summary}</div>
                <div class={`text-xs ${selectedLog?.id === log.id ? 'text-background/70' : 'text-muted-foreground'}`}>
                  {log.actorLabel} · {log.workflowLabel} · {log.targetLabel}
                </div>
              </div>
              <ArrowRight class={`mt-1 h-4 w-4 ${selectedLog?.id === log.id ? 'text-background/70' : 'text-muted-foreground'}`} />
            </button>
          {/each}
        {/if}
      </CardContent>
    </Card>

    <Card class="border-border bg-card shadow-sm">
      <CardHeader>
        <CardTitle class="text-lg">{t('task.admin_audit_logs.activity_signals', {}, 'Activity signals')}</CardTitle>
      </CardHeader>
      <CardContent class="space-y-5">
        <div class="space-y-3">
          <div class="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {t('task.admin_audit_logs.top_module', {}, 'Top module')}
          </div>
          {#each consoleModel.topModules as module}
            <div class="flex items-center justify-between rounded-xl bg-muted/40 px-3 py-2.5">
              <span class="font-medium text-foreground">{module.label}</span>
              <span class="font-['JetBrains_Mono'] text-sm text-muted-foreground">{module.count}</span>
            </div>
          {/each}
        </div>

        <div class="space-y-3">
          <div class="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {t('task.admin_audit_logs.top_actor', {}, 'Top actor')}
          </div>
          {#each consoleModel.topActors as actor}
            <div class="flex items-center justify-between rounded-xl bg-muted/40 px-3 py-2.5">
              <span class="font-medium text-foreground">{actor.label}</span>
              <span class="font-['JetBrains_Mono'] text-sm text-muted-foreground">{actor.count}</span>
            </div>
          {/each}
        </div>
      </CardContent>
    </Card>
  </div>

  <div class="grid gap-5 xl:grid-cols-1 2xl:grid-cols-3">
    <Card class="border-border bg-card shadow-sm">
      <CardHeader>
        <CardTitle class="text-base">{t('task.admin_audit_logs.failure_clusters', {}, 'Failure clusters')}</CardTitle>
      </CardHeader>
      <CardContent class="space-y-3">
        {#if failingWorkflows.length === 0}
          <div class="rounded-xl border border-dashed border-border bg-muted/40 px-3 py-6 text-sm text-muted-foreground">
            {t('task.admin_audit_logs.no_failure_clusters', {}, 'No failure clusters in the current window.')}
          </div>
        {:else}
          {#each failingWorkflows as workflow}
            <div class="flex items-center justify-between rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2.5">
              <span class="pr-3 text-sm font-medium text-rose-800 dark:text-rose-200">{workflow.label}</span>
              <span class="font-['JetBrains_Mono'] text-sm font-semibold text-rose-700 dark:text-rose-300">{workflow.count}</span>
            </div>
          {/each}
        {/if}
      </CardContent>
    </Card>

    <Card class="border-border bg-card shadow-sm">
      <CardHeader>
        <CardTitle class="text-base">{t('task.admin_audit_logs.trace_hotspots', {}, 'Trace hotspots')}</CardTitle>
      </CardHeader>
      <CardContent class="space-y-3">
        {#if traceHotspots.length === 0}
          <div class="rounded-xl border border-dashed border-border bg-muted/40 px-3 py-6 text-sm text-muted-foreground">
            {t('task.admin_audit_logs.no_trace_hotspots', {}, 'No trace is strong enough to form a hotspot yet.')}
          </div>
        {:else}
          {#each traceHotspots as trace}
            <div class="rounded-xl border border-border bg-muted/40 px-3 py-2.5">
              <div class="truncate font-['JetBrains_Mono'] text-[11px] text-foreground">{trace.label}</div>
              <div class="mt-1 text-xs text-muted-foreground">
                {t('task.admin_audit_logs.event_count_window', { count: trace.count }, ':count events in current window')}
              </div>
            </div>
          {/each}
        {/if}
      </CardContent>
    </Card>

    <Card class="border-border bg-card shadow-sm">
      <CardHeader>
        <CardTitle class="flex items-center gap-2 text-base">
          <Gauge class="h-4 w-4 text-amber-600 dark:text-amber-300" />
          {t('task.admin_audit_logs.slowest_tasks', {}, 'Slowest tasks')}
        </CardTitle>
      </CardHeader>
      <CardContent class="space-y-3">
        {#if slowestEvents.length === 0}
          <div class="rounded-xl border border-dashed border-border bg-muted/40 px-3 py-6 text-sm text-muted-foreground">
            {t('task.admin_audit_logs.no_duration_telemetry', {}, 'No duration telemetry to rank slow paths yet.')}
          </div>
        {:else}
          {#each slowestEvents as event}
            <button
              type="button"
              class="w-full rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-3 text-left transition-colors hover:border-amber-500/40"
              onclick={() => onSelect(event.id)}
            >
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <div class="truncate text-sm font-semibold text-amber-900 dark:text-amber-200">{event.summary}</div>
                  <div class="mt-1 text-xs text-amber-700 dark:text-amber-300">{event.moduleLabel} · {event.workflowLabel}</div>
                </div>
                <div class="font-['JetBrains_Mono'] text-sm font-semibold text-amber-800 dark:text-amber-300">{event.durationMs}ms</div>
              </div>
            </button>
          {/each}
        {/if}
      </CardContent>
    </Card>
  </div>
</div>
