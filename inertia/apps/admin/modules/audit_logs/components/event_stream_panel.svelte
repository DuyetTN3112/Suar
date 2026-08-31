<script lang="ts">
  import { Activity, Clock3, Filter, Rows3, Siren, Waypoints } from 'lucide-svelte'

  import Badge from '@/apps/admin/shared/ui/badge.svelte'
  import Card from '@/apps/admin/shared/ui/card.svelte'
  import CardContent from '@/apps/admin/shared/ui/card_content.svelte'
  import CardHeader from '@/apps/admin/shared/ui/card_header.svelte'
  import CardTitle from '@/apps/admin/shared/ui/card_title.svelte'
  import type {
    AdminAuditLogConsoleRow,
    buildAdminAuditLogConsoleModel,
  } from '@/apps/admin/modules/audit_logs/console_model'
  import { formatAuditLogDateTime, outcomeTone, severityTone } from '@/apps/admin/modules/audit_logs/console_view'
  import { useTranslation } from '@/apps/admin/shared/stores/translation.svelte'

  interface Props {
    consoleModel: ReturnType<typeof buildAdminAuditLogConsoleModel>
    selectedLogId: string | null
    onSelect: (logId: string) => void
  }

  const { consoleModel, selectedLogId, onSelect }: Props = $props()
  const { t } = useTranslation()

  type StreamDensity = 'comfortable' | 'compact'
  type StreamGrouping = 'none' | 'trace' | 'workflow'

  interface StreamGroup {
    readonly key: string
    readonly label: string
    readonly rows: AdminAuditLogConsoleRow[]
  }

  let density = $state<StreamDensity>('comfortable')
  let grouping = $state<StreamGrouping>('none')

  const groups = $derived.by<StreamGroup[]>(() => {
    const rows = consoleModel.localPivotRows

    if (grouping === 'none') {
      return [
        {
          key: 'all',
          label: t('task.admin_audit_logs.all_events', {}, 'All events'),
          rows,
        },
      ]
    }

    const grouped = rows.reduce((acc, row) => {
      const key = grouping === 'trace' ? row.investigation.traceId ?? 'no-trace' : row.workflowLabel
      const label =
        grouping === 'trace'
          ? row.investigation.traceId ?? t('admin_ui.audit_logs.no_trace_correlation', {}, 'No trace correlation')
          : row.workflowLabel

      const existing = acc.get(key)
      if (existing) {
        existing.rows.push(row)
        return acc
      }

      acc.set(key, {
        key,
        label,
        rows: [row],
      })
      return acc
    }, new Map<string, StreamGroup>())

    return Array.from(grouped.values())
  })

  function detailPairLimit() {
    return density === 'compact' ? 2 : 4
  }
</script>

<Card class="border-border bg-card shadow-sm">
  <CardHeader>
    <div class="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
      <div class="space-y-1">
        <CardTitle class="flex items-center gap-2 text-lg">
          <Activity class="h-4 w-4 text-foreground" />
          {t('task.admin_audit_logs.tabs.stream', {}, 'Event stream')}
        </CardTitle>
      </div>

      <div class="flex flex-wrap gap-2">
        <button
          type="button"
          class={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
            density === 'comfortable'
              ? 'bg-foreground text-background'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
          onclick={() => {
            density = 'comfortable'
          }}
        >
          <span class="inline-flex items-center gap-1.5">
            <Rows3 class="h-3.5 w-3.5" />
            {t('task.admin_audit_logs.comfortable', {}, 'Comfortable')}
          </span>
        </button>
        <button
          type="button"
          class={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
            density === 'compact'
              ? 'bg-foreground text-background'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
          onclick={() => {
            density = 'compact'
          }}
        >
          {t('task.admin_audit_logs.compact', {}, 'Compact')}
        </button>
        <button
          type="button"
          class={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
            grouping === 'none'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
          onclick={() => {
            grouping = 'none'
          }}
        >
          <span class="inline-flex items-center gap-1.5">
            <Filter class="h-3.5 w-3.5" />
            {t('task.admin_audit_logs.flat', {}, 'Flat')}
          </span>
        </button>
        <button
          type="button"
          class={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
            grouping === 'trace'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
          onclick={() => {
            grouping = 'trace'
          }}
        >
          {t('task.admin_audit_logs.group_by_trace', {}, 'Group trace')}
        </button>
        <button
          type="button"
          class={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
            grouping === 'workflow'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
          onclick={() => {
            grouping = 'workflow'
          }}
        >
          {t('task.admin_audit_logs.group_by_workflow', {}, 'Group workflow')}
        </button>
      </div>
    </div>
  </CardHeader>
  <CardContent class="space-y-3">
    {#if consoleModel.summary.failedCount > 0}
      <div class="rounded-[22px] border border-rose-500/30 bg-rose-500/10 px-4 py-4">
        <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div class="space-y-1">
              <div class="flex items-center gap-2 text-sm font-semibold text-rose-800 dark:text-rose-200">
                <Siren class="h-4 w-4" />
                {t('task.admin_audit_logs.incident_detected', {}, 'Incident detected')}
              </div>
            <div class="text-sm text-rose-700 dark:text-rose-300">
              {t(
                'admin_ui.audit_logs.incident_counts',
                {
                  failures: consoleModel.summary.failedCount,
                  warnings: consoleModel.summary.warningCount,
                },
                ':failures failures · :warnings warnings.'
              )}
            </div>
          </div>
          <div class="flex flex-wrap gap-2">
            {#if consoleModel.failingWorkflows[0]}
              <Badge class="border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300">
                {t('task.admin_audit_logs.hot_workflow_label', { workflow: consoleModel.failingWorkflows[0].label }, 'Hot workflow: :workflow')}
              </Badge>
            {/if}
            {#if consoleModel.traceHotspots[0]}
              <Badge class="border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300">
                {t('task.admin_audit_logs.hot_trace_label', { trace: consoleModel.traceHotspots[0].label }, 'Hot trace: :trace')}
              </Badge>
            {/if}
          </div>
        </div>
      </div>
    {/if}

    {#if consoleModel.localPivotRows.length === 0}
      <div class="rounded-2xl border border-dashed border-border bg-muted/40 px-4 py-8 text-center text-sm text-muted-foreground">
        {t('task.admin_audit_logs.no_matching_local_pivots', {}, 'No events match the current local pivots.')}
      </div>
    {:else}
      {#each groups as group}
        <section class="space-y-3">
          {#if grouping !== 'none'}
            <div class="flex items-center justify-between rounded-xl border border-border bg-muted/40 px-4 py-2.5">
              <div class="min-w-0">
                <div class="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {#if grouping === 'trace'}
                    <Waypoints class="h-3.5 w-3.5" />
                    {t('task.admin_audit_logs.group_by_trace', {}, 'Group trace')}
                  {:else}
                    <Activity class="h-3.5 w-3.5" />
                    {t('task.admin_audit_logs.group_by_workflow', {}, 'Group workflow')}
                  {/if}
                </div>
                <div class="mt-1 truncate font-['JetBrains_Mono'] text-sm text-foreground">{group.label}</div>
              </div>
              <Badge variant="outline" class="border-border bg-card text-muted-foreground">
                {t('admin_ui.audit_logs.group_event_count', { count: group.rows.length }, ':count events')}
              </Badge>
            </div>
          {/if}

          {#each group.rows as log}
            <button
              type="button"
              class={`w-full rounded-[22px] border px-4 text-left transition-all ${
                density === 'compact' ? 'py-3' : 'py-4'
              } ${
                selectedLogId === log.id
                  ? 'border-foreground bg-foreground text-background shadow-[0_20px_50px_-40px_rgba(15,23,42,0.8)]'
                  : 'border-border bg-muted/40 text-foreground hover:border-border hover:bg-card'
              }`}
              onclick={() => onSelect(log.id)}
            >
              <div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div class={`min-w-0 ${density === 'compact' ? 'space-y-2' : 'space-y-3'}`}>
                  <div class="flex flex-wrap items-center gap-2">
                    <Badge class={severityTone(log.investigation.severity)}>{log.severityLabel}</Badge>
                    <Badge class={outcomeTone(log.investigation.outcome)}>{log.outcomeLabel}</Badge>
                    <Badge variant="outline" class={selectedLogId === log.id ? 'border-background/20 bg-background/10 text-background' : ''}>
                      {log.moduleLabel}
                    </Badge>
                    {#if density === 'comfortable'}
                      <Badge variant="outline" class={selectedLogId === log.id ? 'border-background/20 bg-background/10 text-background' : ''}>
                        {log.workflowLabel}
                      </Badge>
                    {/if}
                  </div>

                  <div class="space-y-1">
                    <div class="font-semibold tracking-tight">{log.investigation.summary}</div>
                    <div class={`text-sm ${selectedLogId === log.id ? 'text-background/70' : 'text-muted-foreground'}`}>
                      {log.actorLabel} · {log.targetLabel}
                    </div>
                  </div>

                  <div class={`grid gap-2 text-xs sm:grid-cols-2 ${density === 'comfortable' ? 'xl:grid-cols-4' : 'xl:grid-cols-2'} ${selectedLogId === log.id ? 'text-background/70' : 'text-muted-foreground'}`}>
                    {#each log.detailPairs.slice(0, detailPairLimit()) as pair}
                      <div class="rounded-xl border px-3 py-2 ${selectedLogId === log.id ? 'border-background/10 bg-background/5' : 'border-border bg-card'}">
                        <div class="uppercase tracking-[0.16em] opacity-60">{pair.label}</div>
                        <div class="mt-1 truncate font-['JetBrains_Mono'] text-[11px]">{pair.value}</div>
                      </div>
                    {/each}
                  </div>
                </div>

                <div class={`flex items-center gap-2 text-xs ${selectedLogId === log.id ? 'text-background/70' : 'text-muted-foreground'}`}>
                  <Clock3 class="h-3.5 w-3.5" />
                  {formatAuditLogDateTime(log.createdAt)}
                </div>
              </div>
            </button>
          {/each}
        </section>
      {/each}
    {/if}
  </CardContent>
</Card>
