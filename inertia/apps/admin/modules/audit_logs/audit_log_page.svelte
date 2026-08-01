<script lang="ts">
  import { page, router } from '@inertiajs/svelte'
  import {
    AlertTriangle,
    Archive,
    CheckCircle2,
    Filter,
    Fingerprint,
    RotateCcw,
    Search,
    ShieldCheck,
  } from 'lucide-svelte'

  import SystemAuditDetailSheet from '@/apps/admin/modules/audit_logs/components/system_audit_detail_sheet.svelte'
  import {
    buildAdminAuditLogConsoleModel,
    buildAdminAuditLogTraceTimeline,
    type AdminAuditLogItem,
  } from '@/apps/admin/modules/audit_logs/console_model'
  import {
    formatAuditLogDateTime,
    outcomeTone,
    severityTone,
  } from '@/apps/admin/modules/audit_logs/console_view'
  import type { CursorPagePagination } from '@/apps/admin/shared/lib/pagination'
  import { useTranslation } from '@/apps/admin/shared/stores/translation.svelte'
  import Badge from '@/apps/admin/shared/ui/badge.svelte'
  import Button from '@/apps/admin/shared/ui/button.svelte'
  import UnifiedCursorPagination from '@/apps/admin/shared/ui/unified_cursor_pagination.svelte'

  interface AuditLogFilters {
    search?: string
    action?: string | null
    resourceType?: string | null
    module?: string | null
    workflow?: string | null
    severity?: string | null
    outcome?: string | null
    actorType?: string | null
    retentionClass?: string | null
    traceId?: string | null
    userId?: string | null
    from?: string | null
    to?: string | null
    after?: string | null
    before?: string | null
  }

  interface Props {
    auditLogs: AdminAuditLogItem[]
    pagination: CursorPagePagination
    filters: AuditLogFilters
    title: string
    surface?: 'system' | 'organization' | 'user'
  }

  const { auditLogs, pagination, filters, title, surface = 'system' }: Props = $props()
  const { t } = useTranslation()

  let searchValue = $state('')
  let actionValue = $state('')
  let resourceTypeValue = $state('')
  let moduleValue = $state('')
  let workflowValue = $state('')
  let severityValue = $state('')
  let outcomeValue = $state('')
  let actorTypeValue = $state('')
  let retentionClassValue = $state('')
  let traceIdValue = $state('')
  let userIdValue = $state('')
  let fromValue = $state('')
  let toValue = $state('')
  let selectedLogId = $state<string | null>(null)
  let selectionInitialized = $state(false)

  const consoleModel = $derived(
    buildAdminAuditLogConsoleModel(
      auditLogs,
      {
        severity: '',
        module: '',
        workflow: '',
        outcome: '',
      },
      t
    )
  )
  const currentPath = $derived(page.url.split('?')[0] || '/admin/audit-logs')
  const selectedLog = $derived(
    consoleModel.rows.find((log) => log.id === selectedLogId) ?? null
  )
  const traceTimeline = $derived(
    buildAdminAuditLogTraceTimeline(consoleModel.rows, selectedLog)
  )
  const activeFilterCount = $derived(
    [
      searchValue,
      actionValue,
      resourceTypeValue,
      moduleValue,
      workflowValue,
      severityValue,
      outcomeValue,
      actorTypeValue,
      retentionClassValue,
      traceIdValue,
      userIdValue,
      fromValue,
      toValue,
    ].filter(Boolean).length
  )
  const advancedFilterCount = $derived(
    [
      actionValue,
      resourceTypeValue,
      moduleValue,
      workflowValue,
      actorTypeValue,
      retentionClassValue,
      traceIdValue,
      userIdValue,
      fromValue,
      toValue,
    ].filter(Boolean).length
  )

  $effect(() => {
    searchValue = filters.search ?? ''
    actionValue = filters.action ?? ''
    resourceTypeValue = filters.resourceType ?? ''
    moduleValue = filters.module ?? ''
    workflowValue = filters.workflow ?? ''
    severityValue = filters.severity ?? ''
    outcomeValue = filters.outcome ?? ''
    actorTypeValue = filters.actorType ?? ''
    retentionClassValue = filters.retentionClass ?? ''
    traceIdValue = filters.traceId ?? ''
    userIdValue = filters.userId ?? ''
    fromValue = filters.from ? filters.from.slice(0, 10) : ''
    toValue = filters.to ? filters.to.slice(0, 10) : ''
  })

  $effect(() => {
    if (selectionInitialized) return

    const eventId = new URLSearchParams(page.url.split('?')[1] ?? '').get('event')
    if (eventId && consoleModel.rows.some((log) => log.id === eventId)) {
      selectedLogId = eventId
    }
    selectionInitialized = true
  })

  function addFilterParams(params: URLSearchParams) {
    if (searchValue) params.set('search', searchValue)
    if (actionValue) params.set('action', actionValue)
    if (resourceTypeValue) params.set('resourceType', resourceTypeValue)
    if (moduleValue) params.set('module', moduleValue)
    if (workflowValue) params.set('workflow', workflowValue)
    if (severityValue) params.set('severity', severityValue)
    if (outcomeValue) params.set('outcome', outcomeValue)
    if (actorTypeValue) params.set('actorType', actorTypeValue)
    if (retentionClassValue) params.set('retentionClass', retentionClassValue)
    if (traceIdValue) params.set('traceId', traceIdValue)
    if (userIdValue) params.set('userId', userIdValue)
    if (fromValue) params.set('from', fromValue)
    if (toValue) params.set('to', toValue)
  }

  function buildHref(options: { after?: string | null; before?: string | null } = {}) {
    const params = new URLSearchParams()
    addFilterParams(params)

    if (options.after) {
      params.set('after', options.after)
    } else if (options.before) {
      params.set('before', options.before)
    }

    const query = params.toString()
    return query ? `${currentPath}?${query}` : currentPath
  }

  function applyFilters() {
    selectedLogId = null
    router.visit(buildHref(), {
      preserveState: true,
      preserveScroll: true,
    })
  }

  function resetFilters() {
    searchValue = ''
    actionValue = ''
    resourceTypeValue = ''
    moduleValue = ''
    workflowValue = ''
    severityValue = ''
    outcomeValue = ''
    actorTypeValue = ''
    retentionClassValue = ''
    traceIdValue = ''
    userIdValue = ''
    fromValue = ''
    toValue = ''
    selectedLogId = null
    router.visit(currentPath, {
      preserveState: true,
      preserveScroll: true,
    })
  }

  function loadOlderPage() {
    if (!pagination.cursor?.nextCursor) return
    selectedLogId = null
    router.visit(buildHref({ after: pagination.cursor.nextCursor }), {
      preserveState: true,
      preserveScroll: true,
    })
  }

  function loadNewerPage() {
    if (!pagination.cursor?.previousCursor) return
    selectedLogId = null
    router.visit(buildHref({ before: pagination.cursor.previousCursor }), {
      preserveState: true,
      preserveScroll: true,
    })
  }

  function loadNewestPage() {
    selectedLogId = null
    router.visit(buildHref(), {
      preserveState: true,
      preserveScroll: true,
    })
  }

  function syncSelectedEvent(eventId: string | null) {
    selectedLogId = eventId
    if (typeof window === 'undefined') return

    const nextUrl = new URL(window.location.href)
    if (eventId) {
      nextUrl.searchParams.set('event', eventId)
    } else {
      nextUrl.searchParams.delete('event')
    }
    window.history.replaceState(window.history.state, '', `${nextUrl.pathname}${nextUrl.search}`)
  }

  function rowAccent(log: AdminAuditLogItem): string {
    if (log.investigation.integrity.status === 'mismatch') return 'border-l-rose-500'
    if (log.investigation.outcome === 'failure') return 'border-l-rose-500'
    if (
      log.investigation.outcome === 'warning' ||
      log.investigation.severity === 'warn' ||
      log.investigation.integrity.status === 'legacy_unsealed'
    ) {
      return 'border-l-amber-500'
    }
    return 'border-l-emerald-500/70'
  }

  function integrityTone(status: AdminAuditLogItem['investigation']['integrity']['status']) {
    if (status === 'verified') {
      return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
    }
    if (status === 'mismatch') {
      return 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300'
    }
    return 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300'
  }
</script>

<svelte:head>
  <title>{title}</title>
</svelte:head>

<div class="mx-auto max-w-[94rem] space-y-5" data-surface={surface}>
  <header class="border-b border-border pb-5">
    <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div class="max-w-3xl">
        <p
          class="flex items-center gap-2 font-mono text-[0.7rem] font-bold uppercase tracking-[0.16em] text-primary"
        >
          <ShieldCheck class="size-4" aria-hidden="true" />
          {t('admin_ui.audit_logs.system_scope_eyebrow', {}, 'Platform-wide system evidence')}
        </p>
        <h1 class="mt-2 text-3xl font-semibold tracking-tight text-foreground">{title}</h1>
        <p class="mt-2 text-sm leading-6 text-muted-foreground">
          {t(
            'admin_ui.audit_logs.system_scope_description',
            {},
            'For authorized system administrators investigating platform operations, security events and compliance evidence. This is not a personal or organization activity feed.',
          )}
        </p>
      </div>
      <div class="shrink-0 rounded-lg border border-border bg-card px-4 py-3 text-sm">
        <span class="text-muted-foreground">
          {t('admin_ui.audit_logs.matched_total', {}, 'Matched total')}
        </span>
        <strong class="ml-2 font-mono text-lg text-foreground">
          {pagination.total.toLocaleString()}
        </strong>
      </div>
    </div>
  </header>

  <section
    class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
    aria-label={t('admin_ui.audit_logs.current_window_health', {}, 'Current audit window health')}
  >
    <article class="rounded-xl border border-border bg-card p-4">
      <div class="flex items-center justify-between gap-3">
        <span class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t('admin_ui.audit_logs.current_window', {}, 'Current window')}
        </span>
        <Fingerprint class="size-4 text-sky-600" aria-hidden="true" />
      </div>
      <p class="mt-3 font-mono text-2xl font-semibold text-foreground">
        {consoleModel.summary.total}
      </p>
      <p class="mt-1 text-xs text-muted-foreground">
        {t('admin_ui.audit_logs.loaded_evidence', {}, 'Loaded evidence records')}
      </p>
    </article>

    <article class="rounded-xl border border-border bg-card p-4">
      <div class="flex items-center justify-between gap-3">
        <span class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t('admin_ui.audit_logs.failures_warnings', {}, 'Failures & warnings')}
        </span>
        <AlertTriangle class="size-4 text-amber-600" aria-hidden="true" />
      </div>
      <p class="mt-3 font-mono text-2xl font-semibold text-foreground">
        {consoleModel.summary.failedCount + consoleModel.summary.warningCount}
      </p>
      <p class="mt-1 text-xs text-muted-foreground">
        {t(
          'admin_ui.audit_logs.failure_warning_breakdown',
          {
            failures: consoleModel.summary.failedCount,
            warnings: consoleModel.summary.warningCount,
          },
          ':failures failures · :warnings warnings',
        )}
      </p>
    </article>

    <article
      class={`rounded-xl border p-4 ${
        consoleModel.summary.integrityMismatchCount > 0
          ? 'border-rose-500/40 bg-rose-500/5'
          : 'border-border bg-card'
      }`}
    >
      <div class="flex items-center justify-between gap-3">
        <span class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t('admin_ui.audit_logs.integrity_alerts', {}, 'Integrity alerts')}
        </span>
        <CheckCircle2
          class={`size-4 ${
            consoleModel.summary.integrityMismatchCount > 0
              ? 'text-rose-600'
              : 'text-emerald-600'
          }`}
          aria-hidden="true"
        />
      </div>
      <p class="mt-3 font-mono text-2xl font-semibold text-foreground">
        {consoleModel.summary.integrityMismatchCount}
      </p>
      <p class="mt-1 text-xs text-muted-foreground">
        {t('admin_ui.audit_logs.hash_mismatches', {}, 'Cryptographic hash mismatches')}
      </p>
    </article>

    <article class="rounded-xl border border-border bg-card p-4">
      <div class="flex items-center justify-between gap-3">
        <span class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t('admin_ui.audit_logs.legacy_evidence', {}, 'Legacy evidence')}
        </span>
        <Archive class="size-4 text-amber-600" aria-hidden="true" />
      </div>
      <p class="mt-3 font-mono text-2xl font-semibold text-foreground">
        {consoleModel.summary.legacyUnsealedCount}
      </p>
      <p class="mt-1 text-xs text-muted-foreground">
        {t('admin_ui.audit_logs.unsealed_records', {}, 'Records created before sealing')}
      </p>
    </article>
  </section>

  <section class="rounded-xl border border-border bg-card" aria-labelledby="system-audit-filter-heading">
    <form
      onsubmit={(event) => {
        event.preventDefault()
        applyFilters()
      }}
    >
      <div class="border-b border-border p-4 sm:p-5">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="system-audit-filter-heading" class="font-semibold text-foreground">
              {t('admin_ui.audit_logs.investigation_filters', {}, 'Investigation filters')}
            </h2>
            <p class="mt-1 text-xs text-muted-foreground">
              {t(
                'admin_ui.audit_logs.server_filter_description',
                {},
                'Server-side filters apply to the entire audit store, not only this window.',
              )}
            </p>
          </div>
          {#if activeFilterCount > 0}
            <Badge variant="outline">
              {t(
                'admin_ui.audit_logs.active_filter_count',
                { count: activeFilterCount },
                ':count active',
              )}
            </Badge>
          {/if}
        </div>

        <div class="mt-4 grid gap-3 lg:grid-cols-[minmax(18rem,1fr)_12rem_12rem_auto]">
          <label class="space-y-1 text-sm font-medium text-foreground">
            <span>{t('admin_ui.audit_logs.search', {}, 'Search evidence')}</span>
            <span class="relative block">
              <Search
                class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <input
                class="h-11 w-full rounded-lg border border-input bg-background pl-10 pr-3 text-sm outline-none transition-colors focus:border-ring focus:ring-[3px] focus:ring-ring/15"
                bind:value={searchValue}
                placeholder={t(
                  'admin_ui.audit_logs.search_placeholder',
                  {},
                  'Actor, event, target, request, trace, IP or user agent',
                )}
              />
            </span>
          </label>

          <label class="space-y-1 text-sm font-medium text-foreground">
            <span>{t('admin_ui.audit_logs.severity', {}, 'Severity')}</span>
            <select
              class="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition-colors focus:border-ring focus:ring-[3px] focus:ring-ring/15"
              bind:value={severityValue}
            >
              <option value="">{t('admin_ui.audit_logs.all_severities', {}, 'All severities')}</option>
              <option value="error">Error</option>
              <option value="warn">Warn</option>
              <option value="info">Info</option>
              <option value="debug">Debug</option>
              <option value="trace">Trace</option>
            </select>
          </label>

          <label class="space-y-1 text-sm font-medium text-foreground">
            <span>{t('admin_ui.audit_logs.outcome', {}, 'Outcome')}</span>
            <select
              class="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition-colors focus:border-ring focus:ring-[3px] focus:ring-ring/15"
              bind:value={outcomeValue}
            >
              <option value="">{t('admin_ui.audit_logs.all_outcomes', {}, 'All outcomes')}</option>
              <option value="failure">Failure</option>
              <option value="warning">Warning</option>
              <option value="success">Success</option>
              <option value="skipped">Skipped</option>
              <option value="recorded">Recorded</option>
            </select>
          </label>

          <div class="flex items-end gap-2">
            <Button class="h-11" type="submit">
              <Filter class="mr-2 size-4" aria-hidden="true" />
              {t('admin_ui.audit_logs.apply_filters', {}, 'Apply')}
            </Button>
            <Button
              class="h-11"
              type="button"
              variant="outline"
              aria-label={t('admin_ui.audit_logs.reset_filters', {}, 'Reset filters')}
              onclick={resetFilters}
            >
              <RotateCcw class="size-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </div>

      <details class="group" open={advancedFilterCount > 0}>
        <summary
          class="flex min-h-11 cursor-pointer items-center justify-between gap-3 px-4 py-3 text-sm font-medium text-foreground marker:content-none focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-ring/20 sm:px-5"
        >
          <span>
            {t('admin_ui.audit_logs.advanced_filters', {}, 'Advanced forensic filters')}
            {#if advancedFilterCount > 0}
              <span class="ml-2 text-xs text-muted-foreground">({advancedFilterCount})</span>
            {/if}
          </span>
          <span class="text-muted-foreground transition-transform group-open:rotate-180" aria-hidden="true">
            ▾
          </span>
        </summary>

        <div class="grid gap-3 border-t border-border bg-muted/10 p-4 sm:grid-cols-2 lg:grid-cols-4 sm:p-5">
          {#each [
            ['action', t('admin_ui.audit_logs.action', {}, 'Action'), 'task.assigned'],
            ['resourceType', t('admin_ui.audit_logs.type', {}, 'Target type'), 'task'],
            ['module', t('admin_ui.audit_logs.module', {}, 'Module'), 'tasks'],
            ['workflow', t('admin_ui.audit_logs.workflow', {}, 'Workflow'), 'task_assignment'],
          ] as field}
            <label class="space-y-1 text-sm font-medium text-foreground">
              <span>{field[1]}</span>
              <input
                class="h-11 w-full rounded-lg border border-input bg-background px-3 font-mono text-sm outline-none transition-colors focus:border-ring focus:ring-[3px] focus:ring-ring/15"
                value={
                  field[0] === 'action'
                    ? actionValue
                    : field[0] === 'resourceType'
                      ? resourceTypeValue
                      : field[0] === 'module'
                        ? moduleValue
                        : workflowValue
                }
                placeholder={field[2]}
                oninput={(event) => {
                  const value = event.currentTarget.value
                  if (field[0] === 'action') actionValue = value
                  else if (field[0] === 'resourceType') resourceTypeValue = value
                  else if (field[0] === 'module') moduleValue = value
                  else workflowValue = value
                }}
              />
            </label>
          {/each}

          <label class="space-y-1 text-sm font-medium text-foreground">
            <span>{t('admin_ui.audit_logs.actor_type', {}, 'Actor type')}</span>
            <select
              class="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition-colors focus:border-ring focus:ring-[3px] focus:ring-ring/15"
              bind:value={actorTypeValue}
            >
              <option value="">{t('admin_ui.audit_logs.all_actor_types', {}, 'All actor types')}</option>
              {#each ['user', 'system', 'frontend', 'automation', 'job', 'listener', 'cli', 'integration', 'unknown'] as actorType}
                <option value={actorType}>{actorType}</option>
              {/each}
            </select>
          </label>

          <label class="space-y-1 text-sm font-medium text-foreground">
            <span>{t('admin_ui.audit_logs.retention', {}, 'Retention')}</span>
            <input
              class="h-11 w-full rounded-lg border border-input bg-background px-3 font-mono text-sm outline-none transition-colors focus:border-ring focus:ring-[3px] focus:ring-ring/15"
              bind:value={retentionClassValue}
              placeholder="security_audit"
            />
          </label>

          <label class="space-y-1 text-sm font-medium text-foreground">
            <span>{t('admin_ui.audit_logs.trace_id', {}, 'Trace ID')}</span>
            <input
              class="h-11 w-full rounded-lg border border-input bg-background px-3 font-mono text-sm outline-none transition-colors focus:border-ring focus:ring-[3px] focus:ring-ring/15"
              bind:value={traceIdValue}
              placeholder="trace-…"
            />
          </label>

          <label class="space-y-1 text-sm font-medium text-foreground">
            <span>{t('admin_ui.audit_logs.user_id', {}, 'Actor user ID')}</span>
            <input
              class="h-11 w-full rounded-lg border border-input bg-background px-3 font-mono text-sm outline-none transition-colors focus:border-ring focus:ring-[3px] focus:ring-ring/15"
              bind:value={userIdValue}
              placeholder="uuid"
            />
          </label>

          <label class="space-y-1 text-sm font-medium text-foreground">
            <span>{t('admin_ui.audit_logs.from', {}, 'From')}</span>
            <input
              type="date"
              class="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition-colors focus:border-ring focus:ring-[3px] focus:ring-ring/15"
              bind:value={fromValue}
            />
          </label>

          <label class="space-y-1 text-sm font-medium text-foreground">
            <span>{t('admin_ui.audit_logs.to', {}, 'To')}</span>
            <input
              type="date"
              class="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition-colors focus:border-ring focus:ring-[3px] focus:ring-ring/15"
              bind:value={toValue}
            />
          </label>
        </div>
      </details>
    </form>
  </section>

  <div class="grid gap-5 xl:grid-cols-1" data-testid="audit-log-results-grid">
    <section
      class="overflow-hidden rounded-xl border border-border bg-card"
      data-testid="audit-log-list-panel"
      aria-labelledby="system-audit-event-stream-heading"
    >
      <div class="flex flex-col gap-3 border-b border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 id="system-audit-event-stream-heading" class="font-semibold text-foreground">
            {t('admin_ui.audit_logs.event_stream', {}, 'System evidence stream')}
          </h2>
          <p class="mt-1 text-xs text-muted-foreground">
            {t(
              'admin_ui.audit_logs.window_result_count',
              { count: consoleModel.filteredRows.length, total: pagination.total },
              ':count loaded · :total matched',
            )}
          </p>
        </div>
        {#if pagination.mode === 'cursor'}
          <div class="min-w-0 sm:max-w-xl" data-testid="audit-log-list-pagination">
            <UnifiedCursorPagination
              {pagination}
              class="pt-0"
              onLoadNewer={loadNewerPage}
              onLoadNewest={loadNewestPage}
              onLoadOlder={loadOlderPage}
            />
          </div>
        {/if}
      </div>

      <div
        class="hidden grid-cols-[minmax(19rem,1.6fr)_minmax(11rem,.75fr)_minmax(12rem,.85fr)_10rem] gap-4 border-b border-border bg-muted/30 px-5 py-3 text-[0.68rem] font-bold uppercase tracking-wide text-muted-foreground lg:grid"
        aria-hidden="true"
      >
        <div>{t('admin_ui.audit_logs.event', {}, 'Event')}</div>
        <div>{t('admin_ui.audit_logs.actor', {}, 'Actor')}</div>
        <div>{t('admin_ui.audit_logs.target', {}, 'Target')}</div>
        <div>{t('admin_ui.audit_logs.time', {}, 'Time')}</div>
      </div>

      {#if consoleModel.filteredRows.length === 0}
        <div class="px-4 py-16 text-center">
          <ShieldCheck class="mx-auto size-8 text-muted-foreground/60" aria-hidden="true" />
          <h3 class="mt-3 font-semibold text-foreground">
            {t('admin_ui.audit_logs.no_matching_evidence', {}, 'No matching system evidence')}
          </h3>
          <p class="mt-1 text-sm text-muted-foreground">
            {t(
              'admin_ui.audit_logs.no_matching_evidence_description',
              {},
              'Change or clear filters to inspect another evidence window.',
            )}
          </p>
        </div>
      {:else}
        <div class="divide-y divide-border">
          {#each consoleModel.filteredRows as log}
            <button
              type="button"
              data-testid="audit-log-row"
              class={`grid min-h-20 w-full gap-3 border-l-[3px] px-4 py-4 text-left transition-colors hover:bg-muted/25 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-ring/25 lg:grid-cols-[minmax(19rem,1.6fr)_minmax(11rem,.75fr)_minmax(12rem,.85fr)_10rem] lg:items-center lg:gap-4 lg:px-5 ${rowAccent(log)} ${
                selectedLogId === log.id ? 'bg-primary/5' : 'bg-card'
              }`}
              aria-label={`${log.investigation.summary} · ${log.actorLabel} · ${log.targetLabel}`}
              onclick={() => syncSelectedEvent(log.id)}
            >
              <span class="min-w-0">
                <span class="flex flex-wrap items-center gap-2">
                  <Badge class={outcomeTone(log.investigation.outcome)}>
                    {log.outcomeLabel}
                  </Badge>
                  <Badge class={severityTone(log.investigation.severity)}>
                    {log.severityLabel}
                  </Badge>
                  <Badge class={integrityTone(log.investigation.integrity.status)}>
                    {log.integrityLabel}
                  </Badge>
                </span>
                <span class="mt-2 block font-semibold leading-5 text-foreground">
                  {log.investigation.summary}
                </span>
                <span class="mt-1 block truncate font-mono text-xs text-muted-foreground">
                  {log.investigation.eventName ?? log.action}
                </span>
                <span class="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground lg:hidden">
                  <span>{log.moduleLabel} / {log.workflowLabel}</span>
                  {#if log.investigation.traceId}
                    <span class="font-mono">trace:{log.investigation.traceId}</span>
                  {/if}
                </span>
              </span>

              <span class="min-w-0">
                <span class="block text-[0.68rem] font-bold uppercase tracking-wide text-muted-foreground lg:hidden">
                  {t('admin_ui.audit_logs.actor', {}, 'Actor')}
                </span>
                <span class="mt-1 block truncate text-sm font-medium text-foreground lg:mt-0">
                  {log.actorLabel}
                </span>
                <span class="mt-1 block truncate font-mono text-xs text-muted-foreground">
                  {log.investigation.initiatorType ?? '—'}
                  {#if log.investigation.actorRoleSurface}
                    · {log.investigation.actorRoleSurface}
                  {/if}
                </span>
              </span>

              <span class="min-w-0">
                <span class="block text-[0.68rem] font-bold uppercase tracking-wide text-muted-foreground lg:hidden">
                  {t('admin_ui.audit_logs.target', {}, 'Target')}
                </span>
                <span class="mt-1 block truncate text-sm font-medium text-foreground lg:mt-0">
                  {log.targetLabel}
                </span>
                <span class="mt-1 block truncate font-mono text-xs text-muted-foreground">
                  {log.investigation.targetType ?? log.resourceType}
                </span>
              </span>

              <span class="min-w-0">
                <span class="block text-[0.68rem] font-bold uppercase tracking-wide text-muted-foreground lg:hidden">
                  {t('admin_ui.audit_logs.time', {}, 'Time')}
                </span>
                <time
                  class="mt-1 block text-sm text-muted-foreground lg:mt-0"
                  datetime={log.createdAt}
                >
                  {formatAuditLogDateTime(log.createdAt)}
                </time>
                <span class="mt-1 block font-mono text-xs text-muted-foreground">
                  {log.investigation.requestId ? `req:${log.investigation.requestId}` : '—'}
                </span>
              </span>
            </button>
          {/each}
        </div>
      {/if}
    </section>
  </div>
</div>

<SystemAuditDetailSheet
  open={selectedLog !== null}
  auditEvent={selectedLog}
  {traceTimeline}
  onOpenChange={(open) => {
    if (!open) syncSelectedEvent(null)
  }}
  onSelectTraceEvent={syncSelectedEvent}
/>
