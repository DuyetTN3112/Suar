<script lang="ts">
  import { CalendarRange, Fingerprint, Focus, Layers3, ScanSearch } from 'lucide-svelte'

  import Badge from '@/apps/admin/shared/ui/badge.svelte'
  import Card from '@/apps/admin/shared/ui/card.svelte'
  import CardContent from '@/apps/admin/shared/ui/card_content.svelte'
  import CardHeader from '@/apps/admin/shared/ui/card_header.svelte'
  import CardTitle from '@/apps/admin/shared/ui/card_title.svelte'
  import type {
    AdminAuditLogConsoleFilters,
    AdminAuditLogConsoleRow,
    buildAdminAuditLogConsoleModel,
  } from '@/apps/admin/modules/audit_logs/console_model'
  import type { WorkspaceView } from '@/apps/admin/modules/audit_logs/console_view'
  import { useTranslation } from '@/apps/admin/shared/stores/translation.svelte'

  interface Props {
    activeView: WorkspaceView
    consoleModel: ReturnType<typeof buildAdminAuditLogConsoleModel>
    clientFilters: AdminAuditLogConsoleFilters
    selectedLog: AdminAuditLogConsoleRow | null
    filters: {
      search?: string
      action?: string | null
      resourceType?: string | null
      userId?: string | null
      from?: string | null
      to?: string | null
    }
    onClearLocalFilters: () => void
  }

  const { activeView, consoleModel, clientFilters, selectedLog, filters, onClearLocalFilters }: Props = $props()
  const { t } = useTranslation()

  const activeLocalPivots = $derived(
    [
      clientFilters.severity ? `${t('task.admin_audit_logs.severity', {}, 'Severity')}: ${clientFilters.severity}` : null,
      clientFilters.module ? `${t('task.admin_audit_logs.module', {}, 'Module')}: ${clientFilters.module}` : null,
      clientFilters.workflow ? `${t('task.admin_audit_logs.workflow', {}, 'Workflow')}: ${clientFilters.workflow}` : null,
      clientFilters.outcome ? `${t('task.admin_audit_logs.outcome', {}, 'Outcome')}: ${clientFilters.outcome}` : null,
    ].filter((value): value is string => Boolean(value))
  )

  const serverScope = $derived(
    [
      filters.search?.trim() ? `${t('task.admin_audit_logs.search', {}, 'Search')}: ${filters.search.trim()}` : null,
      filters.action ? `${t('task.admin_audit_logs.action', {}, 'Action')}: ${filters.action}` : null,
      filters.resourceType ? `${t('task.admin_audit_logs.resource', {}, 'Resource')}: ${filters.resourceType}` : null,
      filters.userId ? `${t('task.admin_audit_logs.user', {}, 'User')}: ${filters.userId}` : null,
      filters.from ? `${t('task.admin_audit_logs.from', {}, 'From')}: ${filters.from.slice(0, 10)}` : null,
      filters.to ? `${t('task.admin_audit_logs.to', {}, 'To')}: ${filters.to.slice(0, 10)}` : null,
    ].filter((value): value is string => Boolean(value))
  )

  function viewLabel(view: WorkspaceView) {
    if (view === 'overview') return t('task.admin_audit_logs.tabs.overview', {}, 'Overview')
    if (view === 'stream') return t('task.admin_audit_logs.tabs.stream', {}, 'Event stream')
    if (view === 'evidence') return t('task.admin_audit_logs.tabs.evidence', {}, 'Trace')
    return t('task.admin_audit_logs.tabs.payload', {}, 'Payload')
  }
</script>

<Card class="border-border bg-card shadow-sm">
  <CardHeader>
    <CardTitle class="flex items-center gap-2 text-base">
      <Focus class="h-4 w-4 text-foreground" />
      {t('task.admin_audit_logs.view_scope', {}, 'View scope')}
    </CardTitle>
  </CardHeader>
  <CardContent class="space-y-4">
    <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
      <div class="rounded-2xl border border-border bg-muted/40 px-4 py-3">
        <div class="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          <Layers3 class="h-3.5 w-3.5" />
          {t('task.admin_audit_logs.area', {}, 'Area')}
        </div>
        <div class="mt-2 text-sm font-semibold text-foreground">{viewLabel(activeView)}</div>
      </div>
      <div class="rounded-2xl border border-border bg-muted/40 px-4 py-3">
        <div class="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          <Fingerprint class="h-3.5 w-3.5" />
          {t('task.admin_audit_logs.selected_trace', {}, 'Selected trace')}
        </div>
        <div class="mt-2 truncate font-['JetBrains_Mono'] text-xs text-foreground">
          {selectedLog?.investigation.traceId ?? selectedLog?.investigation.requestId ?? t('task.admin_audit_logs.no_trace', {}, 'No trace yet')}
        </div>
      </div>
    </div>

    <div class="rounded-2xl border border-border bg-primary/10 px-4 py-4">
      <div class="flex items-center justify-between gap-3">
        <div>
          <div class="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {t('task.admin_audit_logs.current_window', {}, 'Current window')}
          </div>
          <div class="mt-1 text-2xl font-semibold tracking-tight text-foreground">{consoleModel.summary.total}</div>
        </div>
        <div class="text-right">
          <div class="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {t('task.admin_audit_logs.errors', {}, 'Errors')}
          </div>
          <div class="mt-1 font-['JetBrains_Mono'] text-lg font-semibold text-rose-700 dark:text-rose-300">
            {consoleModel.summary.failedCount}
          </div>
        </div>
      </div>
      <div class="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
        <div class="rounded-xl bg-card/80 px-3 py-2">{t('task.admin_audit_logs.warning', {}, 'Warning')}: {consoleModel.summary.warningCount}</div>
        <div class="rounded-xl bg-card/80 px-3 py-2">{t('task.admin_audit_logs.structured', {}, 'Structured')}: {consoleModel.summary.structuredCount}</div>
      </div>
    </div>

    <div class="space-y-2">
      <div class="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        <ScanSearch class="h-3.5 w-3.5" />
        {t('task.admin_audit_logs.local_filters', {}, 'Local filters')}
      </div>
      {#if activeLocalPivots.length === 0}
        <div class="rounded-xl border border-dashed border-border bg-muted/40 px-3 py-3 text-sm text-muted-foreground">
          {t('task.admin_audit_logs.no_local_pivots', {}, 'No local pivots yet.')}
        </div>
      {:else}
        <div class="flex flex-wrap gap-2">
          {#each activeLocalPivots as pivot}
            <Badge variant="outline" class="border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300">{pivot}</Badge>
          {/each}
        </div>
        <button
          type="button"
          class="text-xs font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          onclick={onClearLocalFilters}
        >
          {t('task.admin_audit_logs.clear_filters', {}, 'Clear filters')}
        </button>
      {/if}
    </div>

    <div class="space-y-2">
      <div class="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        <CalendarRange class="h-3.5 w-3.5" />
        {t('task.admin_audit_logs.server_filters', {}, 'Server filters')}
      </div>
      {#if serverScope.length === 0}
        <div class="rounded-xl border border-dashed border-border bg-muted/40 px-3 py-3 text-sm text-muted-foreground">
          {t('task.admin_audit_logs.no_server_filters', {}, 'No server filters.')}
        </div>
      {:else}
        <div class="space-y-2">
          {#each serverScope as scopeLine}
            <div class="rounded-xl border border-border bg-muted/40 px-3 py-2 text-sm text-foreground">
              {scopeLine}
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </CardContent>
</Card>
