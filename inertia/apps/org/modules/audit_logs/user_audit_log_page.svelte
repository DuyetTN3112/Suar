<script lang="ts">
  import { page, router } from '@inertiajs/svelte'

  import OrganizationLayout from '@/apps/org/shared/layouts/organization_layout.svelte'
  import { currentDocumentLocale } from '@/apps/org/shared/lib/date_locale'
  import type { CursorPagePagination } from '@/apps/org/shared/lib/pagination'
  import { useTranslation } from '@/apps/org/shared/stores/translation.svelte'
  import Badge from '@/apps/org/shared/ui/badge.svelte'
  import UnifiedCursorPagination from '@/apps/org/shared/ui/unified_cursor_pagination.svelte'
  import type {
    AuditActivityCategory,
    AuditActivityOutcome,
    UserAuditActivityItem,
  } from '@/apps/org/modules/audit_logs/models/activity_item'

  interface Props {
    auditLogs: UserAuditActivityItem[]
    pagination: CursorPagePagination
    title: string
  }

  const { auditLogs, pagination, title }: Props = $props()
  const { t } = useTranslation()
  const currentPath = $derived(page.url.split('?')[0] || '/')
  const hasCursorPagination = $derived(pagination.mode === 'cursor')
  const documentLocale = $derived(currentDocumentLocale() === 'vi' ? 'vi-VN' : 'en-US')

  function buildHref(options: { after?: string | null; before?: string | null } = {}) {
    const params = new URLSearchParams()
    if (options.after) params.set('after', options.after)
    if (options.before) params.set('before', options.before)
    const query = params.toString()
    return query ? `${currentPath}?${query}` : currentPath
  }

  function loadOlderPage() {
    if (pagination.cursor?.nextCursor) {
      router.visit(buildHref({ after: pagination.cursor.nextCursor }), { preserveScroll: true })
    }
  }

  function loadNewerPage() {
    if (pagination.cursor?.previousCursor) {
      router.visit(buildHref({ before: pagination.cursor.previousCursor }), { preserveScroll: true })
    }
  }

  function loadNewestPage() {
    router.visit(currentPath, { preserveScroll: true })
  }

  function categoryLabel(category: AuditActivityCategory): string {
    return t(`task.audit_activity.categories.${category}`, {}, category)
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
    return new Intl.DateTimeFormat(documentLocale, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value))
  }
</script>

<svelte:head>
  <title>{title}</title>
</svelte:head>

<OrganizationLayout {title}>
  <main class="mx-auto max-w-4xl space-y-7 px-1 pb-10">
    <header class="border-b border-border pb-6">
      <p class="font-mono text-[0.7rem] font-bold uppercase tracking-[0.18em] text-primary">
        {t('task.audit_activity.private_eyebrow', {}, 'Private')}
      </p>
      <h1 class="mt-3 text-3xl font-semibold tracking-tight text-foreground">{title}</h1>
      <p class="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
        {t(
          'task.audit_activity.private_description',
          {},
          'Only account-impacting activity is shown here. Diagnostic data and internal identifiers are hidden.',
        )}
      </p>
    </header>

    <section
      class="overflow-hidden rounded-xl border border-border bg-card shadow-sm"
      aria-label={t('task.audit_activity.personal_aria', {}, 'Personal activity history')}
    >
      {#if hasCursorPagination}
        <div class="border-b border-border px-5">
          <UnifiedCursorPagination
            {pagination}
            summary={t('task.audit_activity.personal_summary', {}, 'Browse activity history')}
            onLoadNewer={loadNewerPage}
            onLoadNewest={loadNewestPage}
            onLoadOlder={loadOlderPage}
          />
        </div>
      {/if}

      {#if auditLogs.length === 0}
        <div class="px-6 py-16 text-center">
          <p class="font-medium text-foreground">
            {t('task.audit_activity.personal_empty_title', {}, 'No activity yet.')}
          </p>
          <p class="mt-2 text-sm text-muted-foreground">
            {t('task.audit_activity.personal_empty_description', {}, 'Account-related changes will appear here.')}
          </p>
        </div>
      {:else}
        <ol class="divide-y divide-border">
          {#each auditLogs as log}
            <li class="flex gap-4 px-5 py-5">
              <div class="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-primary" aria-hidden="true"></div>
              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-2">
                  <p class="font-medium text-foreground">{log.title}</p>
                  <Badge variant="outline">{categoryLabel(log.category)}</Badge>
                </div>
                <p class="mt-1 text-sm leading-6 text-muted-foreground">{log.description}</p>
                <div class="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <Badge variant={outcomeVariant(log.outcome)}>{outcomeLabel(log.outcome)}</Badge>
                  <time class="text-xs text-muted-foreground" datetime={log.occurredAt}>{formatOccurredAt(log.occurredAt)}</time>
                </div>
              </div>
            </li>
          {/each}
        </ol>
      {/if}
    </section>
  </main>
</OrganizationLayout>
