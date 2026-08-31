<script lang="ts">
  import { Link, router } from '@inertiajs/svelte'
  import axios from 'axios'
  import { AlertTriangle, Bot, CalendarDays, ChevronRight, FolderKanban, RotateCw } from 'lucide-svelte'

  import type { CursorPagePagination } from '@/apps/admin/shared/lib/pagination'
  import { currentDocumentLocale } from '@/apps/admin/shared/lib/date_locale'
  import UnifiedCursorPagination from '@/apps/admin/shared/ui/unified_cursor_pagination.svelte'
  import { useTranslation } from '@/apps/admin/shared/stores/translation.svelte'

  import { diagnoseAiFailure } from './ai_failure_diagnostics'

  type DisputeLane = 'pending' | 'ai_reviewing' | 'ai_failed' | 'admin_reviewing' | 'resolved'

  interface Dispute {
    id: string
    review_session_id?: string | null
    task_id?: string | null
    task_title: string | null
    project_id?: string | null
    projectId?: string | null
    project_name?: string | null
    projectName?: string | null
    sprint_id?: string | null
    sprintId?: string | null
    sprint_name?: string | null
    sprintName?: string | null
    reviewee_username: string | null
    reviewee_email: string | null
    status: string
    source_type?: string | null
    sourceType?: string | null
    dispute_review_type?: string | null
    disputeReviewType?: string | null
    ai_evaluations_count?: number | null
    aiEvaluationsCount?: number | null
    last_error_message?: string | null
    lastErrorMessage?: string | null
    dispute_reason: string
    requested_outcome: string
    created_at: string
  }

  interface Props {
    disputes: Dispute[]
    pagination: CursorPagePagination
    filters: {
      status: string | null
      search?: string | null
      requested_outcome?: string | null
      final_decision?: string | null
    }
  }

  const { disputes, pagination, filters }: Props = $props()
  const { t } = useTranslation()
  const documentLocale = $derived(currentDocumentLocale() === 'vi' ? 'vi-VN' : 'en-US')
  const lanes: DisputeLane[] = [
    'pending',
    'ai_reviewing',
    'ai_failed',
    'admin_reviewing',
    'resolved',
  ]
  const laneTone: Record<DisputeLane, string> = {
    pending: 'border-t-muted-foreground',
    ai_reviewing: 'border-t-primary',
    ai_failed: 'border-t-destructive',
    admin_reviewing: 'border-t-foreground',
    resolved: 'border-t-primary',
  }
  const laneFallbacks: Record<DisputeLane, string> = {
    pending: 'Pending',
    ai_reviewing: 'AI reviewing',
    ai_failed: 'AI processing failed — retry required',
    admin_reviewing: 'Admin reviewing',
    resolved: 'Resolved',
  }
  const columns = $derived(
    lanes.map((status) => ({
      status,
      cards: disputes.filter((dispute) => laneFor(dispute.status) === status),
    }))
  )
  const aiActiveCount = $derived(
    disputes.filter((dispute) => dispute.status === 'ai_reviewing').length
  )
  const decisionReadyCount = $derived(
    disputes.filter((dispute) => dispute.status === 'admin_reviewing').length
  )
  let retryingId = $state<string | null>(null)
  let retryErrorId = $state<string | null>(null)

  function laneFor(status: string): DisputeLane {
    if (status === 'ai_reviewing') return 'ai_reviewing'
    if (status === 'ai_failed') return 'ai_failed'
    if (status === 'admin_reviewing') return 'admin_reviewing'
    if (['resolved', 'done', 'rejected', 'cancelled'].includes(status)) return 'resolved'

    // A report submitted from the review UI, and any legacy evidence-gathering
    // stage, are both cases waiting for the system workflow to begin.
    return 'pending'
  }

  function statusLabel(status: DisputeLane): string {
    return t(`task.disputes.index.status.${status}`, {}, laneFallbacks[status])
  }

  function closureLabel(status: string): string | null {
    if (status === 'done') return t('task.disputes.index.status.done', {}, 'Đã hoàn tất')
    if (status === 'rejected') return t('task.disputes.index.status.rejected', {}, 'Rejected')
    if (status === 'cancelled') return t('task.disputes.index.status.cancelled', {}, 'Cancelled')
    return null
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

  function aiEvaluationCount(dispute: Dispute): number {
    return Number(dispute.aiEvaluationsCount ?? dispute.ai_evaluations_count ?? 0)
  }

  function aiFailureMessage(dispute: Dispute): string {
    const raw = (dispute.lastErrorMessage ?? dispute.last_error_message ?? '').replace(/\s+/g, ' ').trim()
    if (diagnoseAiFailure(raw).kind === 'quota_or_rate_limit') {
      return t(
        'task.disputes.index.ai_failure_quota',
        {},
        'AI provider quota was reached. Update the API key or quota, then retry.'
      )
    }
    if (diagnoseAiFailure(raw).kind === 'timeout') {
      return t(
        'task.disputes.index.ai_failure_timeout',
        {},
        'AI timed out before returning a decision. Retry the evaluation.'
      )
    }
    return raw.slice(0, 180) || t('task.disputes.index.ai_failure_unknown', {}, 'AI returned an unknown error.')
  }

  function aiFailureRaw(dispute: Dispute): string {
    return (dispute.lastErrorMessage ?? dispute.last_error_message ?? '').replace(/\s+/g, ' ').trim()
  }

  async function retryAiEvaluation(dispute: Dispute): Promise<void> {
    retryingId = dispute.id
    retryErrorId = null
    try {
      await axios.post(`/api/admin/reviews/disputes/${dispute.id}/ai-evaluations`, {
        provider: 'clawagent',
        source_type: 'task_review_workflow',
      })
      router.reload()
    } catch {
      retryErrorId = dispute.id
    } finally {
      retryingId = null
    }
  }

  function formatDate(value: string): string {
    return new Intl.DateTimeFormat(documentLocale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(value))
  }

  function buildPageHref(cursorKey?: 'before' | 'after', cursor?: string | null): string {
    const params = new URLSearchParams({
      ...(filters.status && { status: filters.status }),
      ...(filters.requested_outcome && { requested_outcome: filters.requested_outcome }),
      ...(filters.final_decision && { final_decision: filters.final_decision }),
      ...(cursorKey && cursor ? { [cursorKey]: cursor } : {}),
    })
    const query = params.toString()
    return query ? `/admin/disputes?${query}` : '/admin/disputes'
  }

  const paginationFrom = $derived(
    pagination.total === 0 ? 0 : Math.max((pagination.page - 1) * pagination.perPage + 1, 0)
  )
  const paginationTo = $derived(Math.min(pagination.page * pagination.perPage, pagination.total))
  const paginationSummary = $derived(
    t(
      'task.disputes.index.board_window',
      { from: paginationFrom, to: paginationTo, total: pagination.total },
      `Showing cases ${paginationFrom}-${paginationTo} of ${pagination.total}`
    )
  )
</script>

<svelte:head>
  <title>{t('task.disputes.index.page_title', {}, 'Admin - AI dispute board')}</title>
</svelte:head>

<div class="space-y-4">
  <section class="rounded-3xl border border-border bg-card p-5 shadow-xs">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div class="max-w-3xl">
        <p class="text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">
          {t('task.disputes.index.eyebrow', {}, 'System admin / Board 05')}
        </p>
        <h1 class="mt-1 text-3xl font-black tracking-tight text-foreground">
          {t('task.disputes.index.ai_board_title', {}, 'AI dispute progress board')}
        </h1>
        <p class="mt-2 text-sm font-medium leading-6 text-muted-foreground">
          {t(
            'task.disputes.index.ai_board_subtitle',
            {},
            'One system-level board for queued reports, AI evaluation, admin decision, and closure.'
          )}
        </p>
      </div>
      <div class="flex flex-wrap gap-2">
        <div class="rounded-xl border border-border bg-background px-3 py-2">
          <span class="block text-[10px] font-black uppercase tracking-wider text-muted-foreground">
            {t('task.disputes.index.total_cases', {}, 'Total cases')}
          </span>
          <strong class="text-xl text-foreground">{pagination.total}</strong>
        </div>
        <div class="rounded-xl border border-primary/30 bg-primary/10 px-3 py-2">
          <span class="block text-[10px] font-black uppercase tracking-wider text-primary">
            {t('task.disputes.index.ai_active', {}, 'AI active')}
          </span>
          <strong class="text-xl text-primary">{aiActiveCount}</strong>
        </div>
        <div class="rounded-xl border border-border bg-background px-3 py-2">
          <span class="block text-[10px] font-black uppercase tracking-wider text-muted-foreground">
            {t('task.disputes.index.decision_ready', {}, 'Admin reviewing')}
          </span>
          <strong class="text-xl text-foreground">{decisionReadyCount}</strong>
        </div>
      </div>
    </div>
  </section>

  <section
    class="min-w-0 overflow-hidden rounded-3xl border border-border bg-card p-3 shadow-xs"
    aria-label={t('task.disputes.index.ai_board_title', {}, 'AI dispute progress board')}
  >
    <div class="flex gap-3 overflow-x-auto pb-3">
      {#each columns as column (column.status)}
        <section
          class={`flex min-h-[520px] w-[320px] shrink-0 flex-col overflow-hidden rounded-2xl border border-t-4 border-border bg-muted/30 ${laneTone[column.status]}`}
        >
          <header class="flex items-center justify-between gap-2 border-b border-border px-3.5 py-3">
            <div class="inline-flex min-w-0 items-center gap-2">
              {#if column.status === 'ai_reviewing'}
                <Bot class="h-4 w-4 shrink-0 text-primary" />
              {:else if column.status === 'ai_failed'}
                <AlertTriangle class="h-4 w-4 shrink-0 text-destructive" />
              {:else}
                <FolderKanban class="h-4 w-4 shrink-0 text-muted-foreground" />
              {/if}
              <h2 class="truncate text-sm font-black text-foreground">
                {statusLabel(column.status)}
              </h2>
            </div>
            <span class="rounded-full border border-border bg-background px-2 py-0.5 text-[11px] font-black">
              {column.cards.length}
            </span>
          </header>

          <div class="flex flex-1 flex-col gap-2.5 overflow-y-auto p-3">
            {#each column.cards as dispute (dispute.id)}
              {@const aiCount = aiEvaluationCount(dispute)}
              {@const closedAs = closureLabel(dispute.status)}
              <article
                class="rounded-xl border border-border bg-background p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md"
              >
                <Link href={`/admin/disputes/${dispute.id}`} class="group block">
                <div class="flex items-start justify-between gap-2">
                  <h3 class="line-clamp-2 text-sm font-black leading-5 text-foreground">
                    {primaryContextLabel(dispute)}
                  </h3>
                  <ChevronRight class="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:text-primary" />
                </div>
                {#if hierarchyLabel(dispute)}
                  <p class="mt-1 truncate text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {hierarchyLabel(dispute)}
                  </p>
                {/if}
                <p class="mt-2 line-clamp-3 text-xs leading-5 text-muted-foreground">
                  {dispute.dispute_reason}
                </p>
                  <div class="mt-3 flex flex-wrap items-center gap-1.5">
                  <span class="rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-bold text-foreground">
                    {dispute.requested_outcome}
                  </span>
                  {#if closedAs}
                    <span class="rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                      {closedAs}
                    </span>
                  {/if}
                  {#if aiCount > 0}
                    <span class="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-black text-primary">
                      <Bot class="h-3 w-3" /> {aiCount}
                    </span>
                  {/if}
                  </div>
                  <div class="mt-3 flex items-center justify-between gap-2 border-t border-border pt-2 text-[10px] font-semibold text-muted-foreground">
                  <span class="truncate">{dispute.reviewee_username ?? dispute.reviewee_email ?? 'Unknown'}</span>
                  <span class="inline-flex shrink-0 items-center gap-1">
                    <CalendarDays class="h-3 w-3" /> {formatDate(dispute.created_at)}
                  </span>
                  </div>
                </Link>
                {#if dispute.status === 'ai_failed'}
                  {@const failure = diagnoseAiFailure(aiFailureRaw(dispute))}
                  <div class="mt-3 rounded-lg border border-destructive/25 bg-destructive/5 p-2.5">
                    <p class="text-xs font-bold text-foreground">
                      {t('task.disputes.index.ai_failure_summary', {}, 'AI could not complete this arbitration. Review the error below and retry.')}
                    </p>
                    <p class="mt-1 line-clamp-3 text-xs leading-5 text-muted-foreground">
                      {aiFailureMessage(dispute)}
                    </p>
                    <details class="mt-2 rounded-md border border-border/80 bg-background/70 px-2.5 py-2">
                      <summary class="cursor-pointer text-[11px] font-bold text-foreground">
                        Chi tiết lỗi và hướng xử lý
                      </summary>
                      <div class="mt-2 space-y-2 text-[11px] leading-5">
                        <p class="font-bold text-foreground">{failure.label}</p>
                        <p class="text-muted-foreground">{failure.explanation}</p>
                        <p class="text-muted-foreground"><span class="font-semibold text-foreground">Xử lý:</span> {failure.action}</p>
                        {#if aiFailureRaw(dispute)}
                          <pre class="max-h-32 overflow-auto whitespace-pre-wrap break-words rounded-md bg-muted/50 p-2 font-mono text-[10px] leading-4 text-foreground">{aiFailureRaw(dispute)}</pre>
                        {/if}
                      </div>
                    </details>
                    <button
                      type="button"
                      class="mt-2 inline-flex min-h-8 items-center gap-1.5 rounded-md bg-destructive px-2.5 py-1.5 text-xs font-black text-destructive-foreground transition hover:bg-destructive/90 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={retryingId === dispute.id}
                      onclick={() => retryAiEvaluation(dispute)}
                    >
                      <RotateCw class={`h-3.5 w-3.5 ${retryingId === dispute.id ? 'animate-spin' : ''}`} />
                      {retryingId === dispute.id
                        ? t('task.disputes.index.retrying_ai', {}, 'Retrying…')
                        : t('task.disputes.index.retry_ai', {}, 'Retry AI')}
                    </button>
                    {#if retryErrorId === dispute.id}
                      <p class="mt-2 text-xs font-bold text-destructive" role="alert">
                        {t('task.disputes.index.retry_ai_failed', {}, 'AI retry could not be started. Please try again.')}
                      </p>
                    {/if}
                  </div>
                {/if}
              </article>
            {:else}
              <div class="grid min-h-24 place-items-center rounded-xl border border-dashed border-border px-3 text-center text-xs font-bold text-muted-foreground">
                {t('task.disputes.index.empty_lane', {}, 'No cases in this lane')}
              </div>
            {/each}
          </div>
        </section>
      {/each}
    </div>

    {#if pagination.total > pagination.perPage}
      <div class="border-t border-border pt-3">
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
  </section>
</div>
