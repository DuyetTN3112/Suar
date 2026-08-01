<script lang="ts">
  import { page, router } from '@inertiajs/svelte'
  import { ChevronRight, History, ShieldCheck } from 'lucide-svelte'
  import { onMount } from 'svelte'

  import AuditChangeList from '@/apps/org/modules/audit_logs/components/audit_change_list.svelte'
  import AuditEventDetailSheet from '@/apps/org/modules/audit_logs/components/audit_event_detail_sheet.svelte'
  import AuditLogFilters from '@/apps/org/modules/audit_logs/components/audit_log_filters.svelte'
  import {
    buildOrganizationAuditHref,
    organizationAuditTargetHref,
  } from '@/apps/org/modules/audit_logs/lib/audit_log_query'
  import type {
    AuditActivityCategory,
    AuditActivityOutcome,
    OrganizationAuditActivityItem,
    OrganizationAuditFilters,
  } from '@/apps/org/modules/audit_logs/models/activity_item'
  import OrganizationLayout from '@/apps/org/shared/layouts/organization_layout.svelte'
  import { currentDocumentLocale } from '@/apps/org/shared/lib/date_locale'
  import type { CursorPagePagination } from '@/apps/org/shared/lib/pagination'
  import { useTranslation } from '@/apps/org/shared/stores/translation.svelte'
  import Badge from '@/apps/org/shared/ui/badge.svelte'
  import Button from '@/apps/org/shared/ui/button.svelte'
  import UnifiedCursorPagination from '@/apps/org/shared/ui/unified_cursor_pagination.svelte'

  interface Props {
    auditLogs: OrganizationAuditActivityItem[]
    pagination: CursorPagePagination
    filters: OrganizationAuditFilters
    title: string
  }

  const { auditLogs, pagination, filters, title }: Props = $props()
  const { t } = useTranslation()
  const hasCursorPagination = $derived(pagination.mode === 'cursor')
  const documentLocale = $derived(currentDocumentLocale() === 'vi' ? 'vi-VN' : 'en-US')
  const localizedTitle = $derived(
    t('task.audit_activity.organization_title', {}, title || 'Organization audit log')
  )
  const hasActiveFilters = $derived(
    Boolean(filters.search || filters.action || filters.resourceType || filters.outcome || filters.from || filters.to)
  )
  let selectedAuditEvent = $state<OrganizationAuditActivityItem | null>(null)

  function eventIdFromUrl(url: string): string | null {
    return new URLSearchParams(url.split('?')[1] ?? '').get('event')
  }

  function syncSelectedEventFromUrl() {
    const selectedId = eventIdFromUrl(
      typeof window === 'undefined' ? page.url : `${window.location.pathname}${window.location.search}`
    )
    selectedAuditEvent = auditLogs.find((item) => item.id === selectedId) ?? null
  }

  onMount(() => {
    syncSelectedEventFromUrl()
    window.addEventListener('popstate', syncSelectedEventFromUrl)
    return () => window.removeEventListener('popstate', syncSelectedEventFromUrl)
  })

  function visit(href: string) {
    selectedAuditEvent = null
    router.visit(href, {
      preserveScroll: true,
      preserveState: true,
    })
  }

  function loadOlderPage() {
    if (!pagination.cursor?.nextCursor) return
    visit(
      buildOrganizationAuditHref(
        page.url,
        { after: pagination.cursor.nextCursor, event: null },
        { resetCursor: true },
      ),
    )
  }

  function loadNewerPage() {
    if (!pagination.cursor?.previousCursor) return
    visit(
      buildOrganizationAuditHref(
        page.url,
        { before: pagination.cursor.previousCursor, event: null },
        { resetCursor: true },
      ),
    )
  }

  function loadNewestPage() {
    visit(
      buildOrganizationAuditHref(
        page.url,
        { after: null, before: null, event: null },
        { resetCursor: true },
      ),
    )
  }

  function applyFilters(next: Pick<OrganizationAuditFilters, 'search' | 'action' | 'resourceType' | 'outcome' | 'from' | 'to'>) {
    visit(
      buildOrganizationAuditHref(
        page.url,
        {
          search: next.search,
          action: next.action,
          resourceType: next.resourceType,
          outcome: next.outcome,
          from: next.from,
          to: next.to,
          event: null,
        },
        { resetCursor: true },
      ),
    )
  }

  function clearFilters() {
    visit(
      buildOrganizationAuditHref(
        page.url,
        {
          search: null,
          action: null,
          resourceType: null,
          outcome: null,
          userId: null,
          from: null,
          to: null,
          event: null,
        },
        { resetCursor: true },
      ),
    )
  }

  function openDetail(item: OrganizationAuditActivityItem) {
    selectedAuditEvent = item
    if (typeof window !== 'undefined') {
      const href = buildOrganizationAuditHref(
        `${window.location.pathname}${window.location.search}`,
        { event: item.id },
      )
      window.history.pushState({}, '', href)
    }
  }

  function closeDetail() {
    selectedAuditEvent = null
    if (typeof window !== 'undefined') {
      const href = buildOrganizationAuditHref(
        `${window.location.pathname}${window.location.search}`,
        { event: null },
      )
      window.history.replaceState({}, '', href)
    }
  }

  function categoryLabel(category: AuditActivityCategory): string {
    return t(`task.audit_activity.categories.${category}`, {}, category)
  }

  function actionLabel(item: OrganizationAuditActivityItem): string {
    return t(
      `task.audit_activity.actions.${item.actionKey}`,
      {},
      item.actionCode.replaceAll(/[._-]+/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase()),
    )
  }

  function actorTypeLabel(item: OrganizationAuditActivityItem): string {
    return t(
      `task.audit_activity.actor_types.${item.actor.type}`,
      {},
      item.actor.type.replaceAll('_', ' '),
    )
  }

  function outcomeLabel(outcome: AuditActivityOutcome): string {
    return t(`task.audit_activity.outcomes.${outcome}`, {}, outcome)
  }

  function outcomeVariant(outcome: AuditActivityOutcome) {
    if (outcome === 'failure') return 'destructive'
    if (outcome === 'warning') return 'warning'
    if (outcome === 'success') return 'secondary'
    return 'outline'
  }

  function formatOccurredAt(value: string): string {
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) {
      return t('task.audit_activity.invalid_time', {}, 'Invalid timestamp')
    }

    return new Intl.DateTimeFormat(documentLocale, {
      dateStyle: 'medium',
      timeStyle: 'medium',
    }).format(parsed)
  }
</script>

<svelte:head>
  <title>{localizedTitle}</title>
</svelte:head>

<OrganizationLayout title={localizedTitle}>
  <main class="mx-auto max-w-[90rem] space-y-6 px-1 pb-10">
    <header class="relative overflow-hidden rounded-2xl border border-border bg-card px-5 py-6 shadow-sm sm:px-7">
      <div class="pointer-events-none absolute inset-y-0 right-0 w-72 bg-[radial-gradient(circle_at_center,theme(colors.primary/0.10),transparent_68%)]" aria-hidden="true"></div>
      <div class="relative grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-end">
        <div>
          <div class="flex items-center gap-2 font-mono text-[0.7rem] font-bold uppercase tracking-[0.18em] text-primary">
            <ShieldCheck class="size-4" aria-hidden="true" />
            {t('task.audit_activity.org_eyebrow', {}, 'Governance record')}
          </div>
          <h1 class="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            {localizedTitle}
          </h1>
          <p class="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">
            {t(
              'task.audit_activity.org_description',
              {},
              'Governance history needed for organization coordination. Operational payloads and internal identifiers are hidden.',
            )}
          </p>
        </div>
        <div class="rounded-xl border border-border bg-background/80 p-4">
          <p class="font-mono text-xs uppercase tracking-[0.12em] text-muted-foreground">
            {t('task.audit_activity.org_count_label', {}, 'Organization evidence')}
          </p>
          <p class="mt-2 text-3xl font-semibold tabular-nums text-foreground">
            {pagination.total.toLocaleString(documentLocale)}
          </p>
          <p class="mt-1 text-sm text-muted-foreground">
            {t('task.audit_activity.org_count', {}, 'records in organization scope')}
          </p>
        </div>
      </div>
    </header>

    <AuditLogFilters {filters} onApply={applyFilters} onClear={clearFilters} />

    <section
      class="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
      aria-label={t('task.audit_activity.org_aria', {}, 'Organization governance history')}
    >
      {#if hasCursorPagination && auditLogs.length > 0}
        <div class="border-b border-border px-4 sm:px-5">
          <UnifiedCursorPagination
            {pagination}
            summary={t('task.audit_activity.org_summary', {}, 'Browse governance history')}
            onLoadNewer={loadNewerPage}
            onLoadNewest={loadNewestPage}
            onLoadOlder={loadOlderPage}
          />
        </div>
      {/if}

      {#if auditLogs.length === 0}
        <div class="px-6 py-20 text-center">
          <div class="mx-auto flex size-12 items-center justify-center rounded-xl border border-border bg-muted/30 text-muted-foreground">
            <History class="size-5" aria-hidden="true" />
          </div>
          <h2 class="mt-4 font-semibold text-foreground">
            {hasActiveFilters
              ? t('task.audit_activity.empty_filtered.title', {}, 'No records match these filters.')
              : t('task.audit_activity.org_empty_title', {}, 'No governance changes yet.')}
          </h2>
          <p class="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
            {hasActiveFilters
              ? t(
                  'task.audit_activity.empty_filtered.description',
                  {},
                  'Adjust or clear the filters to broaden the investigation.',
                )
              : t(
                  'task.audit_activity.org_empty_description',
                  {},
                  'Member, permission, project, and task changes will be recorded here.',
                )}
          </p>
          {#if hasActiveFilters}
            <Button type="button" variant="outline" class="mt-5 min-h-11" onclick={clearFilters}>
              {t('task.audit_activity.filters.clear', {}, 'Clear filters')}
            </Button>
          {/if}
        </div>
      {:else}
        <div class="hidden overflow-x-auto lg:block">
          <table class="w-full border-collapse text-left text-sm">
            <caption class="sr-only">
              {t('task.audit_activity.org_aria', {}, 'Organization governance history')}
            </caption>
            <thead class="border-b border-border bg-muted/30">
              <tr>
                <th scope="col" class="min-w-64 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t('task.audit_activity.event', {}, 'Event')}
                </th>
                <th scope="col" class="min-w-44 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t('task.audit_activity.actor', {}, 'Actor')}
                </th>
                <th scope="col" class="min-w-44 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t('task.audit_activity.target', {}, 'Target')}
                </th>
                <th scope="col" class="min-w-64 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t('task.audit_activity.changes', {}, 'Changes')}
                </th>
                <th scope="col" class="min-w-48 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t('task.audit_activity.time', {}, 'Time')}
                </th>
                <th scope="col" class="w-16 px-4 py-3">
                  <span class="sr-only">{t('task.audit_activity.details', {}, 'Details')}</span>
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              {#each auditLogs as log (log.id)}
                {@const targetHref = organizationAuditTargetHref(log.target)}
                <tr class="group align-top transition-colors hover:bg-muted/20">
                  <td class="px-5 py-4">
                    <button
                      type="button"
                      class="min-h-11 w-full cursor-pointer rounded-md text-left focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30"
                      aria-label={`${t('task.audit_activity.view_details', {}, 'View details')}: ${actionLabel(log)}`}
                      onclick={() => openDetail(log)}
                    >
                      <span class="font-semibold text-foreground">{actionLabel(log)}</span>
                      <span class="mt-1 flex flex-wrap items-center gap-2">
                        <Badge variant="outline">{categoryLabel(log.category)}</Badge>
                        <span class="font-mono text-xs text-muted-foreground">{log.actionCode}</span>
                      </span>
                    </button>
                  </td>
                  <td class="px-4 py-4">
                    <p class="font-medium text-foreground">{log.actor.label}</p>
                    <p class="mt-1 text-xs text-muted-foreground">
                      {actorTypeLabel(log)}
                      {#if log.actor.roleLabel} · {log.actor.roleLabel}{/if}
                    </p>
                  </td>
                  <td class="px-4 py-4">
                    {#if targetHref}
                      <a
                        href={targetHref}
                        class="font-medium text-foreground underline-offset-4 hover:text-primary hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30"
                      >
                        {log.target.label}
                      </a>
                    {:else}
                      <p class="font-medium text-foreground">{log.target.label}</p>
                    {/if}
                    <p class="mt-1 font-mono text-xs text-muted-foreground">{log.target.type}</p>
                  </td>
                  <td class="px-4 py-4">
                    <AuditChangeList changes={log.changes.slice(0, 2)} compact />
                    {#if log.changeCount > 2}
                      <p class="mt-1 text-xs font-medium text-primary">
                        {t('task.audit_activity.more_changes', { count: log.changeCount - 2 }, '+:count more')}
                      </p>
                    {/if}
                  </td>
                  <td class="px-4 py-4">
                    <Badge variant={outcomeVariant(log.outcome)}>{outcomeLabel(log.outcome)}</Badge>
                    <time class="mt-2 block whitespace-nowrap text-xs text-muted-foreground" datetime={log.occurredAt}>
                      {formatOccurredAt(log.occurredAt)}
                    </time>
                  </td>
                  <td class="px-4 py-4">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      class="size-11"
                      aria-label={`${t('task.audit_activity.view_details', {}, 'View details')}: ${actionLabel(log)}`}
                      onclick={() => openDetail(log)}
                    >
                      <ChevronRight class="size-4" aria-hidden="true" />
                    </Button>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>

        <ol class="divide-y divide-border lg:hidden">
          {#each auditLogs as log (log.id)}
            {@const targetHref = organizationAuditTargetHref(log.target)}
            <li class="p-4 sm:p-5">
              <article>
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0">
                    <Badge variant="outline">{categoryLabel(log.category)}</Badge>
                    <h2 class="mt-2 text-base font-semibold leading-6 text-foreground">
                      {actionLabel(log)}
                    </h2>
                  </div>
                  <Badge variant={outcomeVariant(log.outcome)}>{outcomeLabel(log.outcome)}</Badge>
                </div>

                <dl class="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {t('task.audit_activity.actor', {}, 'Actor')}
                    </dt>
                    <dd class="mt-1 font-medium text-foreground">{log.actor.label}</dd>
                    <dd class="mt-0.5 text-xs text-muted-foreground">
                      {actorTypeLabel(log)}
                      {#if log.actor.roleLabel} · {log.actor.roleLabel}{/if}
                    </dd>
                  </div>
                  <div>
                    <dt class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {t('task.audit_activity.target', {}, 'Target')}
                    </dt>
                    <dd class="mt-1 font-medium text-foreground">
                      {#if targetHref}
                        <a
                          href={targetHref}
                          class="underline-offset-4 hover:text-primary hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30"
                        >
                          {log.target.label}
                        </a>
                      {:else}
                        {log.target.label}
                      {/if}
                    </dd>
                    <dd class="mt-0.5 font-mono text-xs text-muted-foreground">{log.target.type}</dd>
                  </div>
                </dl>

                <div class="mt-4 rounded-lg border border-border bg-muted/20 p-3">
                  <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t('task.audit_activity.changes', {}, 'Changes')}
                  </p>
                  <AuditChangeList changes={log.changes.slice(0, 2)} compact />
                </div>

                <div class="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <time class="text-xs text-muted-foreground" datetime={log.occurredAt}>
                    {formatOccurredAt(log.occurredAt)}
                  </time>
                  <Button
                    type="button"
                    variant="outline"
                    class="min-h-11 gap-2"
                    onclick={() => openDetail(log)}
                  >
                    {t('task.audit_activity.view_details', {}, 'View details')}
                    <ChevronRight class="size-4" aria-hidden="true" />
                  </Button>
                </div>
              </article>
            </li>
          {/each}
        </ol>
      {/if}
    </section>
  </main>
</OrganizationLayout>

<AuditEventDetailSheet
  open={selectedAuditEvent !== null}
  auditEvent={selectedAuditEvent}
  onOpenChange={(open) => {
    if (!open) closeDetail()
  }}
/>
