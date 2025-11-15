<script lang="ts">
  import { Link, router } from '@inertiajs/svelte'

  import Badge from '@/apps/admin/shared/ui/badge.svelte'
  import Button from '@/apps/admin/shared/ui/button.svelte'
  import Card from '@/apps/admin/shared/ui/card.svelte'
  import CardContent from '@/apps/admin/shared/ui/card_content.svelte'
  import CardHeader from '@/apps/admin/shared/ui/card_header.svelte'
  import CardTitle from '@/apps/admin/shared/ui/card_title.svelte'
  import type { CursorPagePagination } from '@/apps/admin/shared/lib/pagination'
  import { currentDocumentLocale } from '@/apps/admin/shared/lib/date_locale'
  import DataTableFilters from '@/apps/admin/shared/ui/data_table_filters.svelte'
  import type { FilterConfig } from '@/apps/admin/shared/ui/data_table_filters_types'
  import UnifiedCursorPagination from '@/apps/admin/shared/ui/unified_cursor_pagination.svelte'
  import { useTranslation } from '@/apps/admin/shared/stores/translation.svelte'

  interface Dispute {
    id: string
    review_session_id: string | null
    task_id: string | null
    task_title: string | null
    organization_id?: string | null
    organizationId?: string | null
    project_id?: string | null
    projectId?: string | null
    project_name?: string | null
    projectName?: string | null
    sprint_id?: string | null
    sprintId?: string | null
    sprint_name?: string | null
    sprintName?: string | null
    reviewee_id: string
    reviewee_username: string | null
    reviewee_email: string | null
    status: string
    source_type?: string | null
    sourceType?: string | null
    dispute_review_type?: string | null
    disputeReviewType?: string | null
    ai_evaluations_count?: number | null
    aiEvaluationsCount?: number | null
    dispute_reason: string
    requested_outcome: string
    created_at: string
  }

  interface Props {
    disputes: Dispute[]
    pagination: CursorPagePagination
    filters: {
      status: string | null
      search: string | null
      after?: string | null
      before?: string | null
      requested_outcome?: string | null
      final_decision?: string | null
    }
  }

  const { disputes, pagination, filters }: Props = $props()
  const { t } = useTranslation()
  const documentLocale = $derived(currentDocumentLocale() === 'vi' ? 'vi-VN' : 'en-US')

  const statusOptions = [
    'pending',
    'reported',
    'admin_reviewing',
    'ai_reviewing',
    'resolved',
    'rejected',
    'cancelled',
  ] as const
  const requestedOutcomeOptions = [
    'adjust_score',
    'request_re_review',
    'dismiss_review',
    'clarify_evidence',
  ] as const
  const finalDecisionOptions = [
    'uphold_review',
    'adjust_score',
    'request_re_review',
    'dismiss_dispute',
    'partially_accept',
  ] as const
  const statusFallbacks: Record<string, string> = {
    pending: 'Pending',
    collecting_evidence: 'Collecting evidence',
    reported: 'Reported',
    admin_reviewing: 'Admin reviewing',
    ai_reviewing: 'AI reviewing',
    resolved: 'Resolved',
    rejected: 'Rejected',
    cancelled: 'Cancelled',
  }
  const requestedOutcomeFallbacks: Record<string, string> = {
    adjust_score: 'Adjust score',
    request_re_review: 'Request re-review',
    request_admin_review: 'Request admin review',
    dismiss_review: 'Dismiss review',
    clarify_evidence: 'Clarify evidence',
    recheck: 'Recheck',
  }
  const finalDecisionFallbacks: Record<string, string> = {
    uphold_review: 'Uphold review',
    adjust_score: 'Adjust score',
    request_re_review: 'Request re-review',
    dismiss_dispute: 'Dismiss dispute',
    partially_accept: 'Partially accept',
  }
  const sourceFallbacks: Record<string, string> = {
    review_dispute: 'Review dispute',
    task_review_dispute: 'Task review dispute',
    task_review_workflow: 'Task workflow',
    sprint_review_dispute: 'Sprint review',
  }
  const openStatuses = ['pending', 'collecting_evidence', 'reported', 'admin_reviewing', 'ai_reviewing']
  const paginationBaseUrl = '/admin/disputes'

  const filterConfig = $derived([
    {
      key: 'status',
      type: 'tabs',
      label: t('task.disputes.index.filter_status', {}, 'Status'),
      options: statusOptions.map((status) => ({
        value: status,
        label: statusLabel(status),
      })),
    },
    {
      key: 'requested_outcome',
      type: 'select',
      label: t('task.disputes.index.filter_requested_outcome', {}, 'Requested outcome'),
      options: requestedOutcomeOptions.map((outcome) => ({
        value: outcome,
        label: requestedOutcomeLabel(outcome),
      })),
    },
    {
      key: 'final_decision',
      type: 'select',
      label: t('task.disputes.index.filter_final_decision', {}, 'Final decision'),
      options: finalDecisionOptions.map((decision) => ({
        value: decision,
        label: finalDecisionLabel(decision),
      })),
    },
  ] satisfies FilterConfig[])

  const filterValues = $derived.by(() => {
    const filterQueryValues: Record<string, string> = {}
    const query = new URLSearchParams(window.location.search)
    filterConfig.forEach((cfg) => {
      const val = query.get(cfg.key)
      if (val) filterQueryValues[cfg.key] = val
    })
    return filterQueryValues
  })

  const statusVariantMap: Record<
    string,
    'destructive' | 'secondary' | 'outline' | 'default'
  > = {
    pending: 'secondary',
    collecting_evidence: 'outline',
    reported: 'secondary',
    admin_reviewing: 'default',
    ai_reviewing: 'outline',
    resolved: 'default',
    rejected: 'destructive',
    cancelled: 'outline',
  }
  const openDisputesCount = $derived(
    disputes.filter((dispute) => openStatuses.includes(dispute.status)).length
  )
  const resolvedDisputesCount = $derived(
    disputes.filter((dispute) => dispute.status === 'resolved').length
  )
  const escalationCount = $derived(
    disputes.filter((dispute) => dispute.status === 'admin_reviewing' || dispute.status === 'ai_reviewing').length
  )

  function handleFilterChange(key: string, value: string) {
    const query = new URLSearchParams(window.location.search)
    if (value) {
      query.set(key, value)
    } else {
      query.delete(key)
    }
    query.delete('page')
    query.delete('after')
    query.delete('before')
    router.visit(`${window.location.pathname}?${query.toString()}`, {
      preserveState: true,
      preserveScroll: true,
    })
  }

  function handleClearFilters() {
    router.visit(window.location.pathname, {
      preserveState: true,
      preserveScroll: true,
    })
  }

  function statusLabel(status: string): string {
    return t(`task.disputes.index.status.${status}`, {}, statusFallbacks[status] ?? status)
  }

  function requestedOutcomeLabel(value: string): string {
    return t(`task.disputes.index.requested_outcome.${value}`, {}, requestedOutcomeFallbacks[value] ?? value)
  }

  function finalDecisionLabel(value: string): string {
    return t(`task.disputes.index.final_decision.${value}`, {}, finalDecisionFallbacks[value] ?? value)
  }

  function disputeSourceType(dispute: Dispute): string {
    return dispute.sourceType ?? dispute.source_type ?? 'review_dispute'
  }

  function sourceLabel(dispute: Dispute): string {
    const sourceType = disputeSourceType(dispute)
    return t(`task.disputes.index.source.${sourceType}`, {}, sourceFallbacks[sourceType] ?? sourceType)
  }

  function reviewTypeLabel(dispute: Dispute): string {
    return dispute.disputeReviewType ?? dispute.dispute_review_type ?? 'task_review'
  }

  function aiEvaluationCount(dispute: Dispute): number {
    return Number(dispute.aiEvaluationsCount ?? dispute.ai_evaluations_count ?? 0)
  }

  function projectLabel(dispute: Dispute): string | null {
    return dispute.projectName ?? dispute.project_name ?? dispute.projectId ?? dispute.project_id ?? null
  }

  function sprintLabel(dispute: Dispute): string | null {
    return dispute.sprintName ?? dispute.sprint_name ?? dispute.sprintId ?? dispute.sprint_id ?? null
  }

  function primaryContextLabel(dispute: Dispute): string {
    return (
      dispute.task_title ??
      projectLabel(dispute) ??
      sprintLabel(dispute) ??
      t('task.disputes.index.unknown_context', {}, 'Unknown review context')
    )
  }

  function hierarchyLabel(dispute: Dispute): string | null {
    const parts = [projectLabel(dispute), sprintLabel(dispute)].filter(Boolean)
    return parts.length > 0 ? parts.join(' / ') : null
  }

  function formatDate(value: string): string {
    return new Intl.DateTimeFormat(documentLocale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(value))
  }

  function resolutionLaneLabel(status: string): string {
    if (status === 'resolved') {
      return t('task.disputes.index.resolution_lane.resolved', {}, 'Case has a final conclusion.')
    }

    if (status === 'admin_reviewing' || status === 'ai_reviewing') {
      return t('task.disputes.index.resolution_lane.escalating', {}, 'Case is in deeper arbitration.')
    }

    return t('task.disputes.index.resolution_lane.collecting', {}, 'Case needs more reconciliation or evidence.')
  }

  function buildPageHref(cursorKey?: 'before' | 'after', cursor?: string | null): string {
    const params = new URLSearchParams({
      ...(filters.status && { status: filters.status }),
      ...(filters.requested_outcome && { requested_outcome: filters.requested_outcome }),
      ...(filters.final_decision && { final_decision: filters.final_decision }),
      ...(cursorKey && cursor ? { [cursorKey]: cursor } : {}),
    })
    const query = params.toString()
    return query ? `${paginationBaseUrl}?${query}` : paginationBaseUrl
  }

  const paginationFrom = $derived(
    pagination.total === 0 ? 0 : Math.max((pagination.page - 1) * pagination.perPage + 1, 0)
  )
  const paginationTo = $derived(Math.min(pagination.page * pagination.perPage, pagination.total))
  const paginationSummary = $derived(
    t(
      'task.disputes.index.pagination_summary',
      {
        from: paginationFrom,
        to: paginationTo,
        total: pagination.total,
        resolved: resolvedDisputesCount,
      },
      `${paginationFrom}-${paginationTo} / ${pagination.total} · ${resolvedDisputesCount} resolved`
    )
  )
</script>

<svelte:head>
  <title>{t('task.disputes.index.page_title', {}, 'Admin - Review disputes')}</title>
</svelte:head>

<div class="space-y-6">
  <section class="rounded-[30px] border border-border bg-card p-6 shadow-xs">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div class="max-w-3xl">
        <p class="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          {t('task.disputes.index.eyebrow', {}, 'Admin / Disputes')}
        </p>
        <h1 class="mt-2 text-4xl font-black tracking-tight text-foreground">
          {t('task.disputes.index.title', {}, 'Dispute queue')}
        </h1>
        <p class="mt-3 text-sm leading-6 text-muted-foreground">
          {t('task.disputes.index.subtitle', {}, 'System-level queue for review disputes that need higher arbitration. Focus on open cases, AI-assisted cases, and cases ready for decision.')}
        </p>
      </div>
      <div class="grid gap-3 sm:grid-cols-3">
        <div class="rounded-2xl border border-border bg-background/85 p-4">
          <div class="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {t('task.disputes.index.total_cases', {}, 'Total cases')}
          </div>
          <div class="mt-2 text-3xl font-black text-foreground">{pagination.total}</div>
        </div>
        <div class="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
          <div class="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-800 dark:text-amber-200">
            {t('task.disputes.index.open_cases', {}, 'Open')}
          </div>
          <div class="mt-2 text-3xl font-black text-amber-900 dark:text-amber-100">{openDisputesCount}</div>
        </div>
        <div class="rounded-2xl border border-sky-200 bg-sky-50/80 p-4 dark:border-sky-900/60 dark:bg-sky-950/30">
          <div class="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-800 dark:text-sky-200">
            {t('task.disputes.index.escalating_cases', {}, 'Escalating')}
          </div>
          <div class="mt-2 text-3xl font-black text-sky-900 dark:text-sky-100">{escalationCount}</div>
        </div>
      </div>
    </div>
  </section>

  <Card class="rounded-[28px] border-border/90">
    <CardHeader>
      <CardTitle>{t('task.disputes.index.filter_title', {}, 'Dispute filters')}</CardTitle>
    </CardHeader>
    <CardContent>
      <DataTableFilters
        filters={filterConfig}
        values={filterValues}
        onFilterChange={handleFilterChange}
      >
        <Button type="button" variant="outline" onclick={handleClearFilters}>
          {t('task.disputes.index.clear_filters', {}, 'Clear filters')}
        </Button>
      </DataTableFilters>
    </CardContent>
  </Card>

  <Card class="rounded-[28px] border-border/90">
    <CardHeader>
      <CardTitle>
        {t('task.disputes.index.list_title', { total: pagination.total }, `Dispute list (${pagination.total})`)}
      </CardTitle>
    </CardHeader>
    <CardContent>
      {#if disputes.length === 0}
        <div class="flex items-center justify-center py-12">
          <div class="max-w-md text-center">
            <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <svg class="h-8 w-8 text-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 class="mb-2 text-lg font-semibold text-foreground">
              {t('task.disputes.index.empty_title', {}, 'No disputes found')}
            </h3>
            <p class="text-muted-foreground">
              {t('task.disputes.index.empty_description', {}, 'No disputes match the current filters.')}
            </p>
          </div>
        </div>
      {:else}
        <div class="grid gap-4 lg:grid-cols-2">
          {#each disputes as dispute (dispute.id)}
            {@const aiCount = aiEvaluationCount(dispute)}
            <article class="rounded-[24px] border border-border bg-card p-5 shadow-xs">
              <div class="flex flex-wrap items-start justify-between gap-3">
                <div class="space-y-2">
                  <div class="flex flex-wrap items-center gap-2">
                    <Badge variant={statusVariantMap[dispute.status] ?? 'outline'} class="rounded-full px-3 py-1.5">
                      {statusLabel(dispute.status)}
                    </Badge>
                    <Badge variant="outline" class="rounded-full px-3 py-1.5">
                      {requestedOutcomeLabel(dispute.requested_outcome)}
                    </Badge>
                    <Badge variant="outline" class="rounded-full px-3 py-1.5">
                      {sourceLabel(dispute)}
                    </Badge>
                    <Badge variant="outline" class="rounded-full px-3 py-1.5 font-mono text-[10px]">
                      {reviewTypeLabel(dispute)}
                    </Badge>
                    {#if aiCount > 0}
                      <Badge variant="secondary" class="rounded-full px-3 py-1.5">
                        {t('task.disputes.index.ai_evaluations_count', { count: aiCount }, `AI ${aiCount} runs`)}
                      </Badge>
                    {/if}
                  </div>
                  <h3 class="text-lg font-semibold text-foreground">{primaryContextLabel(dispute)}</h3>
                  {#if hierarchyLabel(dispute)}
                    <p class="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      {hierarchyLabel(dispute)}
                    </p>
                  {/if}
                  <p class="max-w-2xl text-sm leading-6 text-muted-foreground">{dispute.dispute_reason}</p>
                </div>
                <div class="rounded-2xl border border-border/70 bg-background/80 px-4 py-3 text-right">
                  <div class="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    {t('task.disputes.index.created_at', {}, 'Created at')}
                  </div>
                  <div class="mt-2 text-sm font-semibold text-foreground">{formatDate(dispute.created_at)}</div>
                </div>
              </div>

              <div class="mt-4 grid gap-3 sm:grid-cols-[1.2fr_0.8fr]">
                <div class="rounded-2xl border border-border/70 bg-background/80 p-4">
                  <div class="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    {t('task.disputes.index.reviewee', {}, 'Reviewee')}
                  </div>
                  <div class="mt-2 text-base font-semibold text-foreground">
                    {dispute.reviewee_username ?? t('task.disputes.index.unknown_reviewee', {}, 'Unknown')}
                  </div>
                  <div class="mt-1 text-xs text-muted-foreground">
                    {dispute.reviewee_email ?? t('task.disputes.index.hidden_email', {}, 'Email hidden or unavailable')}
                  </div>
                </div>
                <div class="rounded-2xl border border-border/70 bg-background/80 p-4">
                  <div class="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    {t('task.disputes.index.resolution_lane_title', {}, 'Resolution lane')}
                  </div>
                  <div class="mt-2 text-sm leading-6 text-foreground">
                    {resolutionLaneLabel(dispute.status)}
                  </div>
                </div>
              </div>

              <div class="mt-4 flex items-center justify-between border-t border-border/70 pt-4">
                <div class="text-xs text-muted-foreground">Case #{dispute.id.slice(0, 8)}</div>
                <Link href={`/admin/disputes/${dispute.id}`}>
                  <Button variant="outline" size="sm">
                    {t('task.disputes.index.open_decision_room', {}, 'Open decision room')}
                  </Button>
                </Link>
              </div>
            </article>
          {/each}
        </div>

        <div class="mt-4">
          <UnifiedCursorPagination
            {pagination}
            summary={paginationSummary}
            newestHref={buildPageHref()}
            newerHref={pagination.cursor?.previousCursor
              ? buildPageHref('before', pagination.cursor.previousCursor)
              : undefined}
            olderHref={pagination.cursor?.nextCursor
              ? buildPageHref('after', pagination.cursor.nextCursor)
              : undefined}
          />
        </div>
      {/if}
    </CardContent>
  </Card>
</div>
