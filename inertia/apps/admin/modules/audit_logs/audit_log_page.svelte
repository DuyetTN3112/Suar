<script lang="ts">
  import { page, router } from '@inertiajs/svelte'

  import Badge from '@/apps/admin/shared/ui/badge.svelte'
  import Button from '@/apps/admin/shared/ui/button.svelte'
  import UnifiedCursorPagination from '@/apps/admin/shared/ui/unified_cursor_pagination.svelte'
  import type { CursorPagePagination } from '@/apps/admin/shared/lib/pagination'
  import type { AdminAuditLogItem } from '@/apps/admin/modules/audit_logs/console_model'
  import { useTranslation } from '@/apps/admin/shared/stores/translation.svelte'
  import { buildAdminAuditLogConsoleModel } from '@/apps/admin/modules/audit_logs/console_model'
  import {
    formatAuditLogDateTime,
    formatAuditLogJson,
    outcomeTone,
  } from '@/apps/admin/modules/audit_logs/console_view'

  interface Props {
    auditLogs: AdminAuditLogItem[]
    pagination: CursorPagePagination
    filters: {
      search?: string
      action?: string | null
      resourceType?: string | null
      userId?: string | null
      from?: string | null
      to?: string | null
      after?: string | null
      before?: string | null
    }
    title: string
    surface?: 'system' | 'organization' | 'user'
  }

  const { auditLogs, pagination, filters, title, surface = 'system' }: Props = $props()
  const { t } = useTranslation()

  let actionValue = $state('')
  let resourceTypeValue = $state('')
  let userIdValue = $state('')
  let fromValue = $state('')
  let toValue = $state('')
  let selectedLogId = $state<string | null>(null)

  const consoleModel = $derived(
    buildAdminAuditLogConsoleModel(auditLogs, {
      severity: '',
      module: '',
      workflow: '',
      outcome: '',
    })
  )
  const showUserFilter = $derived(surface === 'system')
  const currentPath = $derived(page.url.split('?')[0] || '/')
  const selectedLog = $derived(
    consoleModel.filteredRows.find((log) => log.id === selectedLogId) ?? null
  )
  const selectedChanges = $derived(selectedLog ? buildChangeRows(selectedLog) : [])
  const hasCursorPagination = $derived(pagination.mode === 'cursor')
  const resultsGridClass = $derived(
    selectedLog
      ? 'grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]'
      : 'grid gap-5 xl:grid-cols-1'
  )

  $effect(() => {
    actionValue = filters.action ?? ''
    resourceTypeValue = filters.resourceType ?? ''
    userIdValue = filters.userId ?? ''
    fromValue = filters.from ? filters.from.slice(0, 10) : ''
    toValue = filters.to ? filters.to.slice(0, 10) : ''
  })

  function buildHref(options: { after?: string | null; before?: string | null } = {}) {
    const params = new URLSearchParams()
    if (actionValue) params.set('action', actionValue)
    if (resourceTypeValue) params.set('resource_type', resourceTypeValue)
    if (showUserFilter && userIdValue) params.set('user_id', userIdValue)
    if (fromValue) params.set('from', fromValue)
    if (toValue) params.set('to', toValue)
    if (options.after) {
      params.set('after', options.after)
    } else if (options.before) {
      params.set('before', options.before)
    }

    const query = params.toString()
    return query ? `${currentPath}?${query}` : currentPath
  }

  function applyFilters() {
    router.visit(buildHref(), {
      preserveState: true,
      preserveScroll: true,
    })
  }

  function resetFilters() {
    actionValue = ''
    resourceTypeValue = ''
    userIdValue = ''
    fromValue = ''
    toValue = ''
    router.visit(currentPath, {
      preserveState: true,
      preserveScroll: true,
    })
  }

  function loadOlderPage() {
    if (!pagination.cursor?.nextCursor) return
    router.visit(buildHref({ after: pagination.cursor.nextCursor }), {
      preserveState: true,
      preserveScroll: true,
    })
  }

  function loadNewerPage() {
    if (!pagination.cursor?.previousCursor) return
    router.visit(buildHref({ before: pagination.cursor.previousCursor }), {
      preserveState: true,
      preserveScroll: true,
    })
  }

  function loadNewestPage() {
    router.visit(buildHref(), {
      preserveState: true,
      preserveScroll: true,
    })
  }

  function formatValue(value: unknown): string {
    if (value === null || value === undefined || value === '') return '—'
    if (typeof value === 'string') return value
    if (typeof value === 'number' || typeof value === 'boolean') return String(value)
    return formatAuditLogJson(value)
  }

  function buildChangeRows(log: AdminAuditLogItem) {
    const keys = Array.from(
      new Set([
        ...Object.keys(log.details.oldValues ?? {}),
        ...Object.keys(log.details.newValues ?? {}),
      ])
    )

    return keys.map((key) => ({
      key,
      oldValue: formatValue(log.details.oldValues?.[key]),
      newValue: formatValue(log.details.newValues?.[key]),
    }))
  }
</script>

<svelte:head>
  <title>{title}</title>
</svelte:head>

<div class="mx-auto max-w-7xl space-y-5">
  <header class="flex flex-col gap-3 border-b border-border pb-5 md:flex-row md:items-end md:justify-between">
    <div>
      <h1 class="text-3xl font-semibold tracking-tight text-foreground">{title}</h1>
    </div>
    <div class="text-sm text-muted-foreground">
      {t('task.admin_audit_logs.event_count', { count: pagination.total.toLocaleString() }, ':count events')}
    </div>
  </header>

  <section class="rounded-lg border border-border bg-card p-4">
    <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
      <label class="space-y-1 text-sm font-medium text-foreground">
        <span>{t('task.admin_audit_logs.action', {}, 'Action')}</span>
        <input
          class="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-ring"
          bind:value={actionValue}
          placeholder="task.assigned"
        />
      </label>
      <label class="space-y-1 text-sm font-medium text-foreground">
        <span>{t('task.admin_audit_logs.type', {}, 'Type')}</span>
        <input
          class="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-ring"
          bind:value={resourceTypeValue}
          placeholder="task"
        />
      </label>
      {#if showUserFilter}
        <label class="space-y-1 text-sm font-medium text-foreground">
          <span>User ID</span>
          <input
            class="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-ring"
            bind:value={userIdValue}
            placeholder="uuid"
          />
        </label>
      {/if}
      <label class="space-y-1 text-sm font-medium text-foreground">
        <span>{t('task.admin_audit_logs.from', {}, 'From')}</span>
        <input
          type="date"
          class="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-ring"
          bind:value={fromValue}
        />
      </label>
      <label class="space-y-1 text-sm font-medium text-foreground">
        <span>{t('task.admin_audit_logs.to', {}, 'To')}</span>
        <input
          type="date"
          class="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-ring"
          bind:value={toValue}
        />
      </label>
      <div class="flex items-end gap-2">
        <Button type="button" onclick={applyFilters}>{t('task.admin_audit_logs.filter', {}, 'Filter')}</Button>
        <Button type="button" variant="outline" onclick={resetFilters}>{t('task.admin_audit_logs.clear', {}, 'Clear')}</Button>
      </div>
    </div>
  </section>

  <div class={resultsGridClass} data-testid="audit-log-results-grid">
    <section class="overflow-hidden rounded-lg border border-border bg-card" data-testid="audit-log-list-panel">
      {#if hasCursorPagination}
        <div class="border-b border-border px-4 py-3" data-testid="audit-log-list-pagination">
          <UnifiedCursorPagination
            {pagination}
            class="pt-0"
            onLoadNewer={loadNewerPage}
            onLoadNewest={loadNewestPage}
            onLoadOlder={loadOlderPage}
          />
        </div>
      {/if}

      <div class="grid grid-cols-[minmax(180px,1fr)_140px_140px_180px] border-b border-border bg-muted/40 px-4 py-3 text-xs font-semibold uppercase text-muted-foreground">
        <div>Event</div>
        <div>Actor</div>
        <div>{t('task.admin_audit_logs.type', {}, 'Type')}</div>
        <div>{t('task.admin_audit_logs.time', {}, 'Time')}</div>
      </div>

      {#if consoleModel.filteredRows.length === 0}
        <div class="px-4 py-12 text-center text-sm text-muted-foreground">
          {t('task.admin_audit_logs.empty', {}, 'No audit logs.')}
        </div>
      {:else}
        {#each consoleModel.filteredRows as log}
          <button
            type="button"
            data-testid="audit-log-row"
            class={`grid w-full grid-cols-[minmax(180px,1fr)_140px_140px_180px] items-center gap-4 border-b border-border px-4 py-3 text-left transition-colors last:border-b-0 ${
              selectedLogId === log.id ? 'bg-primary/5' : 'hover:bg-muted/30'
            }`}
            onclick={() => {
              selectedLogId = log.id
            }}
          >
            <div class="min-w-0">
              <div class="flex min-w-0 items-center gap-2">
                <Badge class={outcomeTone(log.investigation.outcome)}>{log.outcomeLabel}</Badge>
                <span class="truncate font-medium text-foreground">{log.investigation.summary}</span>
              </div>
              <div class="mt-1 truncate font-mono text-xs text-muted-foreground">{log.action}</div>
            </div>
            <div class="truncate text-sm text-muted-foreground">{log.actorLabel}</div>
            <div class="truncate text-sm text-muted-foreground">{log.resourceType}</div>
            <time class="text-sm text-muted-foreground" datetime={log.createdAt}>
              {formatAuditLogDateTime(log.createdAt)}
            </time>
          </button>
        {/each}
      {/if}
    </section>

    {#if selectedLog}
      <aside
        class="rounded-lg border border-border bg-card p-4"
        aria-label={t('task.admin_audit_logs.detail_title', {}, 'Audit detail')}
        data-testid="audit-log-detail-panel"
      >
        <div class="flex items-start justify-between gap-3 border-b border-border pb-4">
          <div class="min-w-0">
            <h2 class="text-lg font-semibold text-foreground">
              {t('task.admin_audit_logs.detail_title', {}, 'Audit detail')}
            </h2>
            <p class="mt-1 truncate font-mono text-xs text-muted-foreground">{selectedLog.id}</p>
          </div>
          <Button
            type="button"
            variant="outline"
            onclick={() => {
              selectedLogId = null
            }}
          >
            {t('common.close', {}, 'Close')}
          </Button>
        </div>

        <div class="mt-4 space-y-5">
          <section class="space-y-2">
            <div class="text-xs font-semibold uppercase text-muted-foreground">Summary</div>
            <div class="font-medium text-foreground">{selectedLog.investigation.summary}</div>
            <div class="font-mono text-xs text-muted-foreground">{selectedLog.action}</div>
          </section>

          <section class="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <div>
              <div class="text-xs font-semibold uppercase text-muted-foreground">Actor</div>
              <div class="mt-1 text-sm text-foreground">{selectedLog.actorLabel}</div>
              <div class="mt-1 font-mono text-xs text-muted-foreground">
                {selectedLog.investigation.actorUserId ?? selectedLog.user?.id ?? '—'}
              </div>
            </div>
            <div>
              <div class="text-xs font-semibold uppercase text-muted-foreground">Target</div>
              <div class="mt-1 text-sm text-foreground">{selectedLog.investigation.targetType ?? selectedLog.resourceType}</div>
              <div class="mt-1 font-mono text-xs text-muted-foreground">
                {selectedLog.investigation.targetId ?? selectedLog.resourceId ?? '—'}
              </div>
            </div>
          </section>

          <section class="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <div>
              <div class="text-xs font-semibold uppercase text-muted-foreground">Request ID</div>
              <div class="mt-1 break-all font-mono text-xs text-foreground">{selectedLog.investigation.requestId ?? '—'}</div>
            </div>
            <div>
              <div class="text-xs font-semibold uppercase text-muted-foreground">Trace ID</div>
              <div class="mt-1 break-all font-mono text-xs text-foreground">{selectedLog.investigation.traceId ?? '—'}</div>
            </div>
            <div>
              <div class="text-xs font-semibold uppercase text-muted-foreground">IP</div>
              <div class="mt-1 break-all font-mono text-xs text-foreground">{selectedLog.ipAddress || '—'}</div>
            </div>
            <div>
              <div class="text-xs font-semibold uppercase text-muted-foreground">User agent</div>
              <div class="mt-1 break-all font-mono text-xs text-foreground">{selectedLog.userAgent || '—'}</div>
            </div>
          </section>

          <section class="space-y-2">
            <div class="text-xs font-semibold uppercase text-muted-foreground">Changes</div>
            {#if selectedChanges.length === 0}
              <div class="text-sm text-muted-foreground">
                {t('task.admin_audit_logs.no_field_changes', {}, 'No field changes.')}
              </div>
            {:else}
              <div class="divide-y divide-border overflow-hidden rounded-md border border-border">
                {#each selectedChanges as change}
                  <div class="grid gap-1 px-3 py-2">
                    <div class="font-mono text-xs font-semibold text-foreground">{change.key}</div>
                    <div class="break-all text-sm text-muted-foreground">
                      {change.oldValue} → {change.newValue}
                    </div>
                  </div>
                {/each}
              </div>
            {/if}
          </section>

          <details class="rounded-md border border-border">
            <summary class="cursor-pointer px-3 py-2 text-sm font-medium text-foreground">Raw payload</summary>
            <pre class="max-h-80 overflow-auto border-t border-border bg-muted/30 p-3 text-xs">{formatAuditLogJson({
              oldValues: selectedLog.details.oldValues,
              newValues: selectedLog.details.newValues,
              investigation: selectedLog.investigation,
            })}</pre>
          </details>
        </div>
      </aside>
    {/if}
  </div>

</div>
