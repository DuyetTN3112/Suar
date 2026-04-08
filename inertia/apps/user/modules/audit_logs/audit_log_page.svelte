<script lang="ts">
  import { page, router } from '@inertiajs/svelte'
  import { ChevronRight, EyeOff, FileClock, History, ShieldCheck } from 'lucide-svelte'
  import { onMount } from 'svelte'

  import UserAuditCategoryIcon from '@/apps/user/modules/audit_logs/components/user_audit_category_icon.svelte'
  import UserAuditDetailSheet from '@/apps/user/modules/audit_logs/components/user_audit_detail_sheet.svelte'
  import UserAuditFilters from '@/apps/user/modules/audit_logs/components/user_audit_filters.svelte'
  import {
    buildUserAuditHref,
    userAuditEventIdFromUrl,
  } from '@/apps/user/modules/audit_logs/lib/user_audit_query'
  import type {
    AuditActivityCategory,
    AuditActivityOutcome,
    UserAuditActivityItem,
    UserAuditActorType,
    UserAuditFilters as UserAuditFilterState,
    UserAuditPerspective,
  } from '@/apps/user/modules/audit_logs/models/activity_item'
  import AppLayout from '@/apps/user/shared/layouts/app_layout.svelte'
  import { currentDocumentLocale } from '@/apps/user/shared/lib/date_locale'
  import type { CursorPagePagination } from '@/apps/user/shared/lib/pagination'
  import { useTranslation } from '@/apps/user/shared/stores/translation.svelte'
  import Badge from '@/apps/user/shared/ui/badge.svelte'
  import Button from '@/apps/user/shared/ui/button.svelte'
  import UnifiedCursorPagination from '@/apps/user/shared/ui/unified_cursor_pagination.svelte'

  interface Props {
    auditLogs: UserAuditActivityItem[]
    pagination: CursorPagePagination
    filters: UserAuditFilterState
    title: string
  }

  const { auditLogs, pagination, filters, title }: Props = $props()
  const { t } = useTranslation()
  const hasCursorPagination = $derived(pagination.mode === 'cursor')
  const documentLocale = $derived(currentDocumentLocale() === 'vi' ? 'vi-VN' : 'en-US')
  const localizedTitle = $derived(t('user_audit.title', {}, title || 'My audit log'))
  const hasActiveFilters = $derived(
    Boolean(filters.search || filters.resourceType || filters.outcome || filters.from || filters.to)
  )
  let selectedAuditEvent = $state<UserAuditActivityItem | null>(null)

  const activityFallbacks: Record<string, string> = {
    'account.created': 'Account created',
    'account.profile_updated': 'Account profile updated',
    'account.restricted': 'Account status changed',
    'access.updated': 'Access changed',
    'activity.recorded': 'Activity recorded',
    'billing.created': 'Billing activity created',
    'billing.removed': 'Billing activity removed',
    'billing.updated': 'Billing activity updated',
    'membership.invitation': 'Organization invitation updated',
    'membership.removed': 'Organization membership removed',
    'membership.role_changed': 'Organization role changed',
    'membership.updated': 'Organization membership updated',
    'organization.created': 'Organization activity created',
    'organization.removed': 'Organization activity removed',
    'organization.updated': 'Organization activity updated',
    'project.created': 'Project created',
    'project.removed': 'Project removed',
    'project.updated': 'Project updated',
    'review.created': 'Review created',
    'review.removed': 'Review removed',
    'review.updated': 'Review updated',
    'security.activity': 'Security activity recorded',
    'security.connected_account': 'Connected sign-in changed',
    'security.credential_changed': 'Credential changed',
    'security.login': 'Signed in',
    'security.logout': 'Signed out',
    'task.created': 'Task created',
    'task.removed': 'Task removed',
    'task.updated': 'Task updated',
  }

  function syncSelectedEventFromUrl() {
    const currentUrl =
      typeof window === 'undefined' ? page.url : `${window.location.pathname}${window.location.search}`
    const selectedId = userAuditEventIdFromUrl(currentUrl)
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
      buildUserAuditHref(
        page.url,
        { after: pagination.cursor.nextCursor, event: null },
        { resetCursor: true }
      )
    )
  }

  function loadNewerPage() {
    if (!pagination.cursor?.previousCursor) return
    visit(
      buildUserAuditHref(
        page.url,
        { before: pagination.cursor.previousCursor, event: null },
        { resetCursor: true }
      )
    )
  }

  function loadNewestPage() {
    visit(
      buildUserAuditHref(
        page.url,
        { after: null, before: null, event: null },
        { resetCursor: true }
      )
    )
  }

  function applyFilters(
    next: Pick<UserAuditFilterState, 'search' | 'resourceType' | 'outcome' | 'from' | 'to'>
  ) {
    visit(
      buildUserAuditHref(
        page.url,
        {
          search: next.search,
          resourceType: next.resourceType,
          outcome: next.outcome,
          from: next.from,
          to: next.to,
          event: null,
        },
        { resetCursor: true }
      )
    )
  }

  function clearFilters() {
    visit(
      buildUserAuditHref(
        page.url,
        {
          search: null,
          resourceType: null,
          outcome: null,
          from: null,
          to: null,
          event: null,
        },
        { resetCursor: true }
      )
    )
  }

  function openDetail(item: UserAuditActivityItem) {
    selectedAuditEvent = item
    if (typeof window !== 'undefined') {
      const href = buildUserAuditHref(
        `${window.location.pathname}${window.location.search}`,
        { event: item.id }
      )
      window.history.pushState({}, '', href)
    }
  }

  function closeDetail() {
    selectedAuditEvent = null
    if (typeof window !== 'undefined') {
      const href = buildUserAuditHref(
        `${window.location.pathname}${window.location.search}`,
        { event: null }
      )
      window.history.replaceState({}, '', href)
    }
  }

  function activityLabel(item: UserAuditActivityItem): string {
    return t(
      `user_audit.activities.${item.activityKey}`,
      {},
      activityFallbacks[item.activityKey] ?? 'Activity recorded'
    )
  }

  function categoryLabel(category: AuditActivityCategory): string {
    return t(`user_audit.categories.${category}`, {}, category.replaceAll('_', ' '))
  }

  function actorLabel(type: UserAuditActorType): string {
    const fallbacks: Record<UserAuditActorType, string> = {
      another_authorized_user: 'Authorized administrator',
      automation: 'Trusted automation',
      integration: 'Connected integration',
      system: 'Suar system',
      unknown: 'Unknown source',
      you: 'You',
    }
    return t(`user_audit.actor_types.${type}`, {}, fallbacks[type])
  }

  function perspectiveLabel(perspective: UserAuditPerspective): string {
    const fallbacks: Record<UserAuditPerspective, string> = {
      affected_you: 'Affected you',
      performed_by_you: 'Performed by you',
    }
    return t(`user_audit.perspectives.${perspective}`, {}, fallbacks[perspective])
  }

  function outcomeLabel(outcome: AuditActivityOutcome): string {
    const fallbacks: Record<AuditActivityOutcome, string> = {
      failure: 'Failed',
      recorded: 'Recorded',
      success: 'Successful',
      warning: 'Needs attention',
    }
    return t(`user_audit.outcomes.${outcome}`, {}, fallbacks[outcome])
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
      return t('user_audit.invalid_time', {}, 'Invalid timestamp')
    }

    return new Intl.DateTimeFormat(documentLocale, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(parsed)
  }
</script>

<svelte:head>
  <title>{localizedTitle}</title>
</svelte:head>

<AppLayout title={localizedTitle}>
  <main class="mx-auto max-w-6xl space-y-6 px-1 pb-10">
    <header
      class="relative overflow-hidden rounded-2xl border border-border bg-card px-5 py-6 shadow-sm sm:px-7"
    >
      <div
        class="pointer-events-none absolute -right-20 -top-32 size-80 rounded-full bg-primary/8 blur-3xl"
        aria-hidden="true"
      ></div>
      <div class="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_19rem] lg:items-end">
        <div>
          <p
            class="flex items-center gap-2 font-mono text-[0.7rem] font-bold uppercase tracking-[0.18em] text-primary"
          >
            <ShieldCheck class="size-4" aria-hidden="true" />
            {t('user_audit.eyebrow', {}, 'Your private evidence ledger')}
          </p>
          <h1 class="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            {localizedTitle}
          </h1>
          <p class="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">
            {t(
              'user_audit.description',
              {},
              'Understand what you did, what directly affected your account, and which safe fields changed. This view is intentionally separate from organization governance and system forensics.',
            )}
          </p>
        </div>

        <div class="rounded-xl border border-border bg-background/85 p-4">
          <p class="font-mono text-xs uppercase tracking-[0.12em] text-muted-foreground">
            {t('user_audit.count_label', {}, 'Personal records')}
          </p>
          <p class="mt-2 text-3xl font-semibold tabular-nums text-foreground">
            {pagination.total.toLocaleString(documentLocale)}
          </p>
          <p class="mt-1 text-sm leading-5 text-muted-foreground">
            {t('user_audit.count_description', {}, 'events in your personal scope')}
          </p>
        </div>
      </div>
    </header>

    <section
      class="grid gap-3 md:grid-cols-3"
      aria-label={t('user_audit.boundary.aria', {}, 'Personal audit privacy boundary')}
    >
      <div class="rounded-xl border border-border bg-card p-4">
        <p class="text-sm font-semibold text-foreground">
          {t('user_audit.boundary.performed_title', {}, 'Actions you performed')}
        </p>
        <p class="mt-1 text-sm leading-6 text-muted-foreground">
          {t(
            'user_audit.boundary.performed_description',
            {},
            'Account, security and work events initiated by you.',
          )}
        </p>
      </div>
      <div class="rounded-xl border border-border bg-card p-4">
        <p class="text-sm font-semibold text-foreground">
          {t('user_audit.boundary.affected_title', {}, 'Changes affecting you')}
        </p>
        <p class="mt-1 text-sm leading-6 text-muted-foreground">
          {t(
            'user_audit.boundary.affected_description',
            {},
            'Role, membership and account changes applied to you.',
          )}
        </p>
      </div>
      <div class="rounded-xl border border-primary/20 bg-primary/5 p-4">
        <p class="flex items-center gap-2 text-sm font-semibold text-foreground">
          <EyeOff class="size-4 text-primary" aria-hidden="true" />
          {t('user_audit.boundary.protected_title', {}, 'Forensics stay protected')}
        </p>
        <p class="mt-1 text-sm leading-6 text-muted-foreground">
          {t(
            'user_audit.boundary.protected_description',
            {},
            'No other actor identity, IP, trace, raw payload or internal target ID.',
          )}
        </p>
      </div>
    </section>

    <UserAuditFilters {filters} onApply={applyFilters} onClear={clearFilters} />

    <section
      class="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
      aria-label={t('user_audit.history_aria', {}, 'Personal audit history')}
    >
      {#if hasCursorPagination && auditLogs.length > 0}
        <div class="border-b border-border px-4 sm:px-5">
          <UnifiedCursorPagination
            {pagination}
            summary={t('user_audit.pagination_summary', {}, 'Browse personal evidence history')}
            onLoadNewer={loadNewerPage}
            onLoadNewest={loadNewestPage}
            onLoadOlder={loadOlderPage}
          />
        </div>
      {/if}

      {#if auditLogs.length === 0}
        <div class="px-6 py-20 text-center">
          <div
            class="mx-auto flex size-12 items-center justify-center rounded-xl border border-border bg-muted/30 text-muted-foreground"
          >
            <History class="size-5" aria-hidden="true" />
          </div>
          <h2 class="mt-4 font-semibold text-foreground">
            {hasActiveFilters
              ? t('user_audit.empty.filtered_title', {}, 'No personal records match these filters.')
              : t('user_audit.empty.title', {}, 'No personal activity yet.')}
          </h2>
          <p class="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
            {hasActiveFilters
              ? t(
                  'user_audit.empty.filtered_description',
                  {},
                  'Adjust or clear the filters to broaden your history.',
                )
              : t(
                  'user_audit.empty.description',
                  {},
                  'Account, security and directly relevant organization activity will appear here.',
                )}
          </p>
          {#if hasActiveFilters}
            <Button type="button" variant="outline" class="mt-5 min-h-11" onclick={clearFilters}>
              {t('user_audit.filters.clear', {}, 'Clear filters')}
            </Button>
          {/if}
        </div>
      {:else}
        <ol class="relative divide-y divide-border">
          {#each auditLogs as log}
            <li class="relative" data-testid="user-audit-row">
              <button
                type="button"
                class="group grid w-full min-w-0 gap-4 px-4 py-5 text-left transition-colors hover:bg-muted/30 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-ring/30 sm:grid-cols-[3rem_minmax(0,1fr)_auto] sm:px-6"
                aria-label={t(
                  'user_audit.open_detail',
                  { event: activityLabel(log) },
                  'View details for :event',
                )}
                onclick={() => openDetail(log)}
              >
                <div
                  class="flex size-11 items-center justify-center rounded-xl border border-primary/15 bg-primary/8 text-primary"
                  aria-hidden="true"
                >
                  <UserAuditCategoryIcon category={log.category} class="size-5" />
                </div>

                <div class="min-w-0">
                  <div class="flex flex-wrap items-center gap-2">
                    <h2 class="font-semibold leading-6 text-foreground">{activityLabel(log)}</h2>
                    <Badge variant="outline">{categoryLabel(log.category)}</Badge>
                  </div>

                  <div class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                    <span class="font-medium text-foreground">{perspectiveLabel(log.perspective)}</span>
                    <span class="text-muted-foreground" aria-hidden="true">·</span>
                    <span class="text-muted-foreground">{actorLabel(log.actor.type)}</span>
                  </div>

                  <div class="mt-3 flex flex-wrap items-center gap-2">
                    {#if log.changeCount > 0}
                      <span
                        class="inline-flex items-center gap-1.5 rounded-md bg-muted/50 px-2.5 py-1 text-xs font-medium text-foreground"
                      >
                        <FileClock class="size-3.5 text-primary" aria-hidden="true" />
                        {t('user_audit.safe_change_count', { count: log.changeCount }, ':count safe changes')}
                      </span>
                    {/if}
                    {#if log.hasHiddenChanges}
                      <span class="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                        <EyeOff class="size-3.5" aria-hidden="true" />
                        {t('user_audit.sensitive_hidden', {}, 'Sensitive detail protected')}
                      </span>
                    {/if}
                  </div>
                </div>

                <div class="flex min-w-0 items-center justify-between gap-3 sm:flex-col sm:items-end">
                  <Badge variant={outcomeVariant(log.outcome)}>{outcomeLabel(log.outcome)}</Badge>
                  <div class="flex items-center gap-2">
                    <time
                      class="whitespace-nowrap text-xs text-muted-foreground"
                      datetime={log.occurredAt}
                    >
                      {formatOccurredAt(log.occurredAt)}
                    </time>
                    <ChevronRight
                      class="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
                      aria-hidden="true"
                    />
                  </div>
                </div>
              </button>
            </li>
          {/each}
        </ol>
      {/if}
    </section>
  </main>
</AppLayout>

<UserAuditDetailSheet
  open={selectedAuditEvent !== null}
  auditEvent={selectedAuditEvent}
  onOpenChange={(open) => {
    if (!open) closeDetail()
  }}
/>
