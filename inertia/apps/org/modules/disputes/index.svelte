<script lang="ts">
  import { Link, router } from '@inertiajs/svelte'

  import Badge from '@/apps/org/shared/ui/badge.svelte'
  import Button from '@/apps/org/shared/ui/button.svelte'
  import Card from '@/apps/org/shared/ui/card.svelte'
  import CardContent from '@/apps/org/shared/ui/card_content.svelte'
  import CardHeader from '@/apps/org/shared/ui/card_header.svelte'
  import CardTitle from '@/apps/org/shared/ui/card_title.svelte'
  import OrganizationLayout from '@/apps/org/shared/layouts/organization_layout.svelte'
  import UnifiedCursorPagination from '@/apps/org/shared/ui/unified_cursor_pagination.svelte'
  import type { CursorPagePagination } from '@/apps/org/shared/lib/pagination'
  import { useTranslation } from '@/apps/org/shared/stores/translation.svelte'

  interface Dispute {
    id: string
    review_session_id: string
    task_id: string
    task_title: string | null
    reviewee_id: string
    reviewee_username: string | null
    status: string
    dispute_reason: string
    requested_outcome: string
    created_at: string
    comments_count?: number
    evidences_count?: number
  }

  interface Props {
    disputes: Dispute[]
    pagination: CursorPagePagination
    filters: {
      status?: string | null
      search?: string | null
      after?: string | null
      before?: string | null
      created_at_start?: string | null
      created_at_end?: string | null
    }
  }

  const { disputes, pagination, filters }: Props = $props()
  const { t } = useTranslation()

  function initialFilter<T>(read: (value: Props['filters']) => T): T {
    return read(filters)
  }

  let search = $state(initialFilter((value) => value.search ?? ''))
  let createdAtStart = $state(initialFilter((value) => value.created_at_start ?? ''))
  let createdAtEnd = $state(initialFilter((value) => value.created_at_end ?? ''))

  const statusOptions = [
    'pending',
    'collecting_evidence',
    'admin_reviewing',
    'ai_reviewing',
    'resolved',
    'rejected',
    'cancelled',
  ] as const
  const statusFallbacks: Record<string, string> = {
    pending: 'Pending',
    collecting_evidence: 'Collecting evidence',
    admin_reviewing: 'Admin reviewing',
    ai_reviewing: 'AI reviewing',
    resolved: 'Resolved',
    rejected: 'Rejected',
    cancelled: 'Cancelled',
  }

  const outcomeFallbacks: Record<string, string> = {
    adjust_score: 'Adjust score',
    request_re_review: 'Request re-review',
    dismiss_review: 'Dismiss review result',
    clarify_evidence: 'Clarify evidence',
    recheck: 'Recheck',
  }

  function buildCursorHref(cursorKey: 'before' | 'after', cursor: string | null | undefined) {
    if (!cursor) return null

    const query = new URLSearchParams()
    if (filters.status) query.set('status', filters.status)
    if (filters.search) query.set('search', filters.search)
    if (filters.created_at_start) query.set('created_at_start', filters.created_at_start)
    if (filters.created_at_end) query.set('created_at_end', filters.created_at_end)
    query.set(cursorKey, cursor)

    return `/org/disputes?${query.toString()}`
  }

  function statusLabel(status: string) {
    return t(`task.disputes.index.status.${status}`, {}, statusFallbacks[status] ?? status)
  }

  function outcomeLabel(outcome: string) {
    return t(`task.disputes.index.requested_outcome.${outcome}`, {}, outcomeFallbacks[outcome] ?? outcome)
  }

  function submitFilters(status = filters.status ?? '') {
    router.get(
      '/org/disputes',
      {
        status: status || undefined,
        search: search.trim() || undefined,
        created_at_start: createdAtStart || undefined,
        created_at_end: createdAtEnd || undefined,
      },
      { preserveState: false, preserveScroll: true }
    )
  }

  function clearFilters() {
    router.get('/org/disputes')
  }
</script>

<svelte:head>
  <title>{t('task.disputes.org_index.page_title', {}, 'Review dispute queue')}</title>
</svelte:head>

<OrganizationLayout title={t('task.disputes.org_index.page_title', {}, 'Review dispute queue')}>
  <div class="space-y-6">
    <div>
      <p class="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Review disputes</p>
      <h1 class="mt-1 text-3xl font-black text-foreground">{t('task.disputes.org_index.title', {}, 'Review dispute queue')}</h1>
    </div>

    <Card>
      <CardHeader>
        <CardTitle>{t('task.disputes.org_index.filter_title', {}, 'Filters')}</CardTitle>
      </CardHeader>
      <CardContent class="space-y-3">
        <div class="flex flex-wrap gap-2" role="tablist" aria-label={t('task.disputes.org_index.status_filter_aria', {}, 'Filter dispute status')}>
          <button
            class={`rounded-md border border-border px-3 py-2 text-sm font-bold ${!filters.status ? 'bg-secondary' : ''}`}
            type="button"
            role="tab"
            aria-selected={!filters.status}
            onclick={() => submitFilters('')}
          >
            {t('task.disputes.org_index.all_statuses', {}, 'All')}
          </button>
          {#each statusOptions as status}
            <button
              class={`rounded-md border border-border px-3 py-2 text-sm font-bold ${filters.status === status ? 'bg-secondary' : ''}`}
              type="button"
              role="tab"
              aria-selected={filters.status === status}
              onclick={() => submitFilters(status)}
            >
              {statusLabel(status)}
            </button>
          {/each}
        </div>

        <form class="grid gap-3 md:grid-cols-[minmax(0,1fr)_10rem_10rem_auto_auto]" onsubmit={(event) => { event.preventDefault(); submitFilters() }}>
          <input class="h-10 rounded-md border border-border px-3 text-sm" bind:value={search} placeholder={t('task.disputes.org_index.search_placeholder', {}, 'Search by task or reason')} />
          <input class="h-10 rounded-md border border-border px-3 text-sm" bind:value={createdAtStart} type="date" aria-label={t('task.disputes.org_index.created_at_start', {}, 'Created from')} />
          <input class="h-10 rounded-md border border-border px-3 text-sm" bind:value={createdAtEnd} type="date" aria-label={t('task.disputes.org_index.created_at_end', {}, 'Created to')} />
          <Button type="submit" variant="outline">{t('task.disputes.org_index.filter_results', {}, 'Filter results')}</Button>
          <Button type="button" variant="outline" onclick={clearFilters}>{t('task.disputes.org_index.clear_filters', {}, 'Clear filters')}</Button>
        </form>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>{t('task.disputes.org_index.list_title', {}, 'Dispute list')}</CardTitle>
      </CardHeader>
      <CardContent class="space-y-3">
        {#if disputes.length === 0}
          <p class="text-sm text-muted-foreground">{t('task.disputes.org_index.empty', {}, 'No matching disputes.')}</p>
        {:else}
          {#each disputes as dispute (dispute.id)}
            <article class="rounded-xl border border-border bg-background p-4">
              <div class="flex flex-wrap items-start justify-between gap-3">
                <div class="min-w-0">
                  <p class="text-sm font-bold text-foreground">
                    {dispute.task_title ?? t('task.disputes.org_index.untitled_task', {}, 'Untitled task')}
                  </p>
                  <p class="mt-1 text-sm text-muted-foreground">{dispute.reviewee_username ?? t('task.disputes.org_index.reviewee_fallback', {}, 'Reviewee')}</p>
                </div>
                <Badge variant="secondary">{statusLabel(dispute.status)}</Badge>
              </div>
              <p class="mt-3 text-sm text-foreground">{dispute.dispute_reason}</p>
              <div class="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>{outcomeLabel(dispute.requested_outcome)}</span>
                <span>{t('task.disputes.org_index.comment_count', { count: dispute.comments_count ?? 0 }, ':count comments')}</span>
                <span>{t('task.disputes.org_index.evidence_count', { count: dispute.evidences_count ?? 0 }, ':count evidence items')}</span>
                <Link class="font-bold text-foreground underline-offset-4 hover:underline" href={`/reviews/disputes/${dispute.id}`}>
                  {t('task.disputes.org_index.view_detail', {}, 'View detail')}
                </Link>
              </div>
            </article>
          {/each}
        {/if}

        <UnifiedCursorPagination
          {pagination}
          newerHref={buildCursorHref('before', pagination.cursor?.previousCursor)}
          olderHref={buildCursorHref('after', pagination.cursor?.nextCursor)}
        />
      </CardContent>
    </Card>
  </div>
</OrganizationLayout>
