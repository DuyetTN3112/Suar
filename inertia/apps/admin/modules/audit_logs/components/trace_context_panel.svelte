<script lang="ts">
  import { Shield } from 'lucide-svelte'

  import Badge from '@/apps/admin/shared/ui/badge.svelte'
  import Card from '@/apps/admin/shared/ui/card.svelte'
  import CardContent from '@/apps/admin/shared/ui/card_content.svelte'
  import CardHeader from '@/apps/admin/shared/ui/card_header.svelte'
  import CardTitle from '@/apps/admin/shared/ui/card_title.svelte'
  import type {
    AdminAuditLogConsoleFilters,
    AdminAuditLogConsoleRow,
    AdminAuditLogTraceTimelineEntry,
  } from '@/apps/admin/modules/audit_logs/console_model'
  import {
    formatAuditLogDateTime,
    outcomeTone,
    severityTone,
  } from '@/apps/admin/modules/audit_logs/console_view'
  import { useTranslation } from '@/apps/admin/shared/stores/translation.svelte'

  interface Props {
    selectedLog: AdminAuditLogConsoleRow | null
    traceTimeline: AdminAuditLogTraceTimelineEntry[]
    onSelectTraceEvent?: (logId: string) => void
    onFilter: <K extends keyof AdminAuditLogConsoleFilters>(
      key: K,
      value: AdminAuditLogConsoleFilters[K]
    ) => void
  }

  const { selectedLog, traceTimeline, onSelectTraceEvent, onFilter }: Props = $props()
  const { t } = useTranslation()
</script>

<Card class="sticky top-6 border-border bg-card shadow-sm">
  <CardHeader class="border-b border-border">
    <CardTitle class="flex items-center gap-2 text-lg">
      <Shield class="h-4 w-4 text-foreground" />
      {t('task.admin_audit_logs.trace', {}, 'Trace')}
    </CardTitle>
  </CardHeader>
  <CardContent class="space-y-5 pt-5">
    {#if selectedLog}
      <div class="space-y-3">
        <div class="flex flex-wrap gap-2">
          <Badge class={severityTone(selectedLog.investigation.severity)}>{selectedLog.severityLabel}</Badge>
          <Badge class={outcomeTone(selectedLog.investigation.outcome)}>{selectedLog.outcomeLabel}</Badge>
          <Badge variant="outline">{selectedLog.moduleLabel}</Badge>
          {#if selectedLog.investigation.traceId}
            <Badge variant="outline" class="font-['JetBrains_Mono'] text-[10px]">
              trace:{selectedLog.investigation.traceId}
            </Badge>
          {/if}
        </div>

        <div class="space-y-1">
          <div class="text-lg font-semibold tracking-tight text-foreground">{selectedLog.investigation.summary}</div>
          <div class="text-sm text-muted-foreground">{selectedLog.actorLabel} · {selectedLog.workflowLabel}</div>
        </div>
      </div>

      <div class="grid gap-2">
        {#each selectedLog.detailPairs as pair}
          <div class="rounded-xl border border-border bg-muted/40 px-3 py-2.5">
            <div class="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{pair.label}</div>
            <div class="mt-1 break-all font-['JetBrains_Mono'] text-[11px] text-foreground">{pair.value}</div>
          </div>
        {/each}
      </div>

      <div class="grid gap-3 md:grid-cols-2">
        <div class="rounded-2xl border border-border bg-muted/40 px-4 py-3">
          <div class="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {t('task.admin_audit_logs.links', {}, 'Links')}
          </div>
          <div class="mt-2 space-y-2 font-['JetBrains_Mono'] text-[11px] text-foreground">
            <div>{t('task.admin_audit_logs.request', {}, 'Request')}: {selectedLog.investigation.requestId ?? 'N/A'}</div>
            <div>{t('task.admin_audit_logs.trace', {}, 'Trace')}: {selectedLog.investigation.traceId ?? 'N/A'}</div>
            <div>{t('task.admin_audit_logs.submission', {}, 'Submission')}: {selectedLog.investigation.frontendSubmissionId ?? 'N/A'}</div>
          </div>
        </div>
        <div class="rounded-2xl border border-border bg-muted/40 px-4 py-3">
          <div class="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {t('task.admin_audit_logs.execution', {}, 'Execution')}
          </div>
          <div class="mt-2 space-y-2 font-['JetBrains_Mono'] text-[11px] text-foreground">
            <div>{t('task.admin_audit_logs.stage', {}, 'Stage')}: {selectedLog.investigation.stage ?? 'N/A'}</div>
            <div>{t('task.admin_audit_logs.duration', {}, 'Duration')}: {selectedLog.investigation.durationMs ?? 'N/A'} ms</div>
            <div>{t('task.admin_audit_logs.retention', {}, 'Retention')}: {selectedLog.investigation.retentionClass ?? 'N/A'}</div>
          </div>
        </div>
      </div>

      {#if traceTimeline.length > 0}
        <div class="space-y-3">
          <div class="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {t('task.admin_audit_logs.trace_chain', {}, 'Trace chain')}
          </div>
          <div class="space-y-2">
            {#each traceTimeline as event, index}
              <button
                type="button"
                class={`w-full rounded-2xl border px-3 py-3 text-left transition-colors ${
                  event.id === selectedLog.id
                    ? 'border-foreground bg-foreground text-background'
                    : 'border-border bg-muted/40 text-foreground hover:bg-card'
                }`}
                onclick={() => onSelectTraceEvent?.(event.id)}
              >
                <div class="flex items-start gap-3">
                  <div class={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                    event.id === selectedLog.id ? 'bg-background/10 text-background' : 'bg-foreground text-background'
                  }`}>
                    {index + 1}
                  </div>
                  <div class="min-w-0 flex-1 space-y-2">
                    <div class="flex flex-wrap gap-2">
                      <Badge class={event.id === selectedLog.id ? 'border-background/20 bg-background/10 text-background' : ''}>
                        {event.severityLabel}
                      </Badge>
                      <Badge class={event.id === selectedLog.id ? 'border-background/20 bg-background/10 text-background' : ''}>
                        {event.outcomeLabel}
                      </Badge>
                    </div>
                    <div class="text-sm font-semibold">{event.summary}</div>
                    <div class={`text-xs ${event.id === selectedLog.id ? 'text-background/70' : 'text-muted-foreground'}`}>
                      {event.moduleLabel} · {event.workflowLabel} · {event.stage ?? 'unknown_stage'}
                    </div>
                    <div class={`font-['JetBrains_Mono'] text-[11px] ${event.id === selectedLog.id ? 'text-background/70' : 'text-muted-foreground'}`}>
                      {formatAuditLogDateTime(event.createdAt)} · {event.requestLabel}
                    </div>
                  </div>
                </div>
              </button>
            {/each}
          </div>
        </div>
      {/if}

      <div class="space-y-2">
        <div class="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {t('task.admin_audit_logs.quick_filters', {}, 'Quick filters')}
        </div>
        <div class="flex flex-wrap gap-2">
          {#if selectedLog.investigation.severity}
            <button
              type="button"
              class="rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-medium text-foreground"
              onclick={() => onFilter('severity', selectedLog.investigation.severity ?? '')}
            >
              {t('task.admin_audit_logs.severity', {}, 'Severity')}: {selectedLog.investigation.severity}
            </button>
          {/if}
          {#if selectedLog.investigation.module}
            <button
              type="button"
              class="rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-medium text-foreground"
              onclick={() => onFilter('module', selectedLog.investigation.module ?? '')}
            >
              {t('task.admin_audit_logs.module', {}, 'Module')}: {selectedLog.investigation.module}
            </button>
          {/if}
          {#if selectedLog.investigation.workflow}
            <button
              type="button"
              class="rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-medium text-foreground"
              onclick={() => onFilter('workflow', selectedLog.investigation.workflow ?? '')}
            >
              {t('task.admin_audit_logs.workflow', {}, 'Workflow')}: {selectedLog.investigation.workflow}
            </button>
          {/if}
        </div>
      </div>

      {#if selectedLog.investigation.errorClass || selectedLog.investigation.errorMessage}
        <div class="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3">
          <div class="text-[11px] font-semibold uppercase tracking-[0.18em] text-rose-600 dark:text-rose-300">
            {t('task.admin_audit_logs.error', {}, 'Error')}
          </div>
          <div class="mt-2 text-sm font-semibold text-rose-800 dark:text-rose-200">{selectedLog.investigation.errorClass ?? 'UnknownError'}</div>
          <div class="mt-1 text-sm text-rose-700 dark:text-rose-300">
            {selectedLog.investigation.errorMessage ?? t('task.admin_audit_logs.no_error_message', {}, 'No error message')}
          </div>
        </div>
      {/if}
    {:else}
      <div class="rounded-2xl border border-dashed border-border bg-muted/40 px-4 py-8 text-center text-sm text-muted-foreground">
        {t('task.admin_audit_logs.select_event_sentence', {}, 'Select an event.')}
      </div>
    {/if}
  </CardContent>
</Card>
