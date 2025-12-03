<script lang="ts">
  import { router } from '@inertiajs/svelte'
  import { AlertTriangle, CheckCircle2, MessageSquareText, Send } from 'lucide-svelte'
  import { currentDocumentLocale } from '@/apps/org/shared/lib/date_locale'
  import { useTranslation } from '@/apps/org/shared/stores/translation.svelte'

  interface DetailUserMessage {
    id: string
    body: string
    created_at: string
    author_id: string
    author_name: string | null
    message_type?: string
  }

  interface Reviewer {
    reviewer_id: string
    reviewer_name: string | null
    reviewer_role: string
    status: 'pending' | 'submitted' | 'waived'
    priority_rank: number
  }

  interface TaskReviewWorkflowDetail {
    task: Record<string, unknown>
    workflow: Record<string, unknown> | null
    reviewers: Reviewer[]
    comments: DetailUserMessage[]
    reviewMessages: DetailUserMessage[]
  }

  interface Props {
    taskId: string
    projectId: string | null
    currentUserId: string | null
    taskDetailUrl: string
    detail: TaskReviewWorkflowDetail
  }

  const { taskId, projectId, currentUserId, taskDetailUrl, detail }: Props = $props()
  const { t } = useTranslation()

  let reviewBody = $state('')
  let responseBody = $state('')
  let reportReason = $state('')

  const workflow = $derived(detail.workflow)
  const workflowId = $derived(String(workflow?.id ?? ''))
  const workflowStatus = $derived(String(workflow?.status ?? 'awaiting_review'))
  const revieweeId = $derived(String(detail.task.assigned_to ?? ''))
  const reviewCount = $derived(Number(workflow?.completed_review_count ?? 0))
  const requiredReviewCount = $derived(Number(workflow?.required_review_count ?? 2))
  const isReviewee = $derived(Boolean(currentUserId && revieweeId === currentUserId))
  const isReviewer = $derived(Boolean(detail.reviewers.some((reviewer) => reviewer.reviewer_id === currentUserId)))
  const pendingReviewer = $derived(
    Boolean(
      detail.reviewers.some(
        (reviewer) => reviewer.reviewer_id === currentUserId && reviewer.status === 'pending'
      )
    )
  )
  const canSubmitReview = $derived(
    Boolean(
      currentUserId &&
        taskId &&
        !isReviewee &&
        (!workflow || pendingReviewer || workflowStatus === 'awaiting_review')
    )
  )
  const canAccept = $derived(
    Boolean(
      workflowId &&
        isReviewee &&
        workflowStatus === 'awaiting_response' &&
        reviewCount >= requiredReviewCount
    )
  )
  const canRespond = $derived(Boolean(workflowId && isReviewee && workflowStatus === 'awaiting_response'))
  const canReport = $derived(Boolean(workflowId && (isReviewer || isReviewee) && workflowStatus === 'disputed'))
  const documentLocale = $derived(currentDocumentLocale() === 'vi' ? 'vi-VN' : 'en-US')
  const dateTimeFormatter = $derived(
    new Intl.DateTimeFormat(documentLocale, {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  )

  function submitReview() {
    if (!canSubmitReview || reviewBody.trim().length === 0) return
    router.post(`/task-reviews/tasks/${taskId}/reviews`, {
      body: reviewBody.trim(),
      project_id: projectId ?? '',
      redirect_to: taskDetailUrl,
    })
  }

  function acceptReview() {
    if (!workflowId) return
    router.post(`/task-reviews/${workflowId}/accept`, {
      project_id: projectId ?? '',
      task_id: taskId,
      redirect_to: taskDetailUrl,
    })
  }

  function respondReview() {
    if (!workflowId || responseBody.trim().length === 0) return
    router.post(`/task-reviews/${workflowId}/respond`, {
      body: responseBody.trim(),
      project_id: projectId ?? '',
      task_id: taskId,
      redirect_to: taskDetailUrl,
    })
  }

  function reportDispute() {
    if (!workflowId || reportReason.trim().length === 0) return
    router.post(`/task-reviews/${workflowId}/report`, {
      reason: reportReason.trim(),
      project_id: projectId ?? '',
      task_id: taskId,
      redirect_to: taskDetailUrl,
    })
  }

  function formatDate(value: unknown): string {
    if (typeof value !== 'string' || value.length === 0) return '—'
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return '—'
    return dateTimeFormatter.format(parsed)
  }
</script>

<section class="rounded-2xl border border-primary/20 bg-primary/5 p-4" data-demo-section="task-review-workflow">
  <div class="flex flex-wrap items-start justify-between gap-3">
    <div>
      <p class="text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">
        {t('task.review_workflow.eyebrow', {}, 'Task review')}
      </p>
      <h3 class="mt-1 text-lg font-black text-foreground">
        {t('task.review_workflow.title', {}, 'Review this task')}
      </h3>
    </div>
    <div class="rounded-full border border-border bg-background px-3 py-1 text-xs font-bold text-foreground">
      {reviewCount}/{requiredReviewCount} · {workflowStatus}
    </div>
  </div>

  <div class="mt-4 space-y-4">
    <section>
      <h4 class="mb-2 text-sm font-black uppercase tracking-[0.14em] text-muted-foreground">
        {t('task.review_workflow.reviewers', {}, 'Reviewers')}
      </h4>
      <div class="space-y-2">
        {#each detail.reviewers as reviewer (reviewer.reviewer_id)}
          <div class="flex min-w-0 items-center justify-between gap-3 rounded-md border border-border bg-background px-3 py-2 text-sm">
            <span class="min-w-0 truncate">{reviewer.reviewer_name ?? reviewer.reviewer_id}</span>
            <span class="shrink-0 text-xs font-bold">{reviewer.reviewer_role} · {reviewer.status}</span>
          </div>
        {:else}
          <div class="rounded-md border border-dashed border-border bg-background/70 px-3 py-3 text-sm text-muted-foreground">
            {t('task.review_workflow.first_review_hint', {}, 'The first review creates the workflow and reviewer quorum.')}
          </div>
        {/each}
      </div>
    </section>

    {#if canSubmitReview}
      <section class="space-y-2 border-t border-border pt-4">
        <label class="text-sm font-bold" for="task-review-body">
          {t('task.review_workflow.review_label', {}, 'Enter review')}
        </label>
        <textarea id="task-review-body" bind:value={reviewBody} class="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"></textarea>
        <button type="button" class="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-bold text-primary-foreground" onclick={submitReview}>
          <Send class="h-4 w-4" />
          {t('task.review_workflow.send_review', {}, 'Send review')}
        </button>
      </section>
    {/if}

    {#if canAccept || canRespond}
      <section class="space-y-3 border-t border-border pt-4">
        {#if canAccept}
          <button type="button" class="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-bold text-primary-foreground" onclick={acceptReview}>
            <CheckCircle2 class="h-4 w-4" />
            {t('task.review_workflow.accept_review', {}, 'Accept review')}
          </button>
        {/if}
        {#if canRespond}
          <div class="space-y-2">
            <label class="text-sm font-bold" for="task-review-response">
              {t('task.review_workflow.response_label', {}, 'Response / discussion')}
            </label>
            <textarea id="task-review-response" bind:value={responseBody} class="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"></textarea>
            <button type="button" class="rounded-md border border-border bg-background px-3 py-2 text-sm font-bold" onclick={respondReview}>
              {t('task.review_workflow.send_response', {}, 'Send response')}
            </button>
          </div>
        {/if}
      </section>
    {/if}

    {#if canReport}
      <section class="space-y-2 border-t border-border pt-4">
        <label class="flex items-center gap-2 text-sm font-bold" for="task-review-report">
          <AlertTriangle class="h-4 w-4" />
          {t('task.review_workflow.dispute_report_label', {}, 'Send dispute report')}
        </label>
        <textarea id="task-review-report" bind:value={reportReason} class="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"></textarea>
        <button type="button" class="rounded-md bg-destructive px-3 py-2 text-sm font-bold text-destructive-foreground" onclick={reportDispute}>
          {t('task.review_workflow.send_report', {}, 'Send report')}
        </button>
      </section>
    {/if}

    <section class="border-t border-border pt-4">
      <h4 class="mb-2 flex items-center gap-2 text-sm font-black uppercase tracking-[0.14em] text-muted-foreground">
        <MessageSquareText class="h-4 w-4" />
        {t('task.review_workflow.thread', {}, 'Review thread')}
      </h4>
      <div class="space-y-2">
        {#each detail.reviewMessages as message (message.id)}
          <div class="rounded-md border border-border bg-background px-3 py-2">
            <div class="flex justify-between gap-2 text-xs text-muted-foreground">
              <span>{message.author_name ?? message.author_id} · {message.message_type}</span>
              <span>{formatDate(message.created_at)}</span>
            </div>
            <p class="mt-1 text-sm text-foreground">{message.body}</p>
          </div>
        {:else}
          <div class="rounded-md border border-dashed border-border bg-background/70 px-3 py-3 text-sm text-muted-foreground">
            {t('task.review_workflow.no_discussion', {}, 'No review discussion yet.')}
          </div>
        {/each}
      </div>
    </section>
  </div>
</section>
