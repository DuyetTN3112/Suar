<script lang="ts">
  import { router } from '@inertiajs/svelte'
  import { AlertTriangle, CheckCircle2, MessageSquareText, Send } from 'lucide-svelte'
  import { currentDocumentLocale } from '@/apps/org/shared/lib/date_locale'
  import { useTranslation } from '@/apps/org/shared/hooks/use_translation.svelte'
  import ReviewObservationAuthoringPanel from '@/apps/shared/components/review_observation_authoring_panel.svelte'
  import {
    loadTaskCompletionReviewPackage,
    projectReviewPackageToObservationContext,
  } from '@/apps/shared/reviews/task_completion_review_package'
  import type { TaskCompletionReviewPackageProjection } from '@/apps/shared/reviews/task_completion_review_package'

  interface DetailUserMessage {
    id: string
    body: string
    created_at: string
    author_id: string
    author_name: string | null
    message_type?: string
    parent_review_message_id?: string | null
    reviewee_decision?: 'accepted' | 'rejected' | null
    requires_reviewer_confirmation?: boolean
    reviewer_agreed_at?: string | null
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
    reviewAuthoringContext?: Record<string, unknown> | null
  }

  interface Props {
    taskId: string
    projectId: string | null
    currentUserId: string | null
    taskDetailUrl: string
    detail: TaskReviewWorkflowDetail
    translate?: (key: string, params?: Record<string, unknown>, fallback?: string) => string
    loadReviewPackage?: (
      reportId: string,
      taskId: string,
      taskAssignmentId: string
    ) => Promise<TaskCompletionReviewPackageProjection | null>
  }

  const {
    taskId,
    projectId,
    currentUserId,
    taskDetailUrl,
    detail,
    translate,
    loadReviewPackage = loadTaskCompletionReviewPackage,
  }: Props = $props()
  const { t } = useTranslation()

  let reviewBody = $state('')
  let editingReview = $state(false)
  let activeResponseReviewId = $state<string | null>(null)
  let editingResponseMessageId = $state<string | null>(null)
  let activeReportReviewId = $state<string | null>(null)
  let responseBody = $state('')
  let disputeType = $state('review_fairness')
  let disputeClaim = $state('')
  let disputeEvidence = $state('')
  let requestedOutcome = $state('reviewer_re_review')
  let actionError = $state('')
  let reviewPackage = $state<TaskCompletionReviewPackageProjection | null>(null)
  let reviewPackageLoading = $state(false)
  let reviewPackageError = $state('')
  let reviewPackageLoadKey = $state('')

  const workflow = $derived(detail.workflow)
  const workflowId = $derived(String(workflow?.id ?? ''))
  const workflowStatus = $derived(String(workflow?.status ?? 'awaiting_review'))
  const workflowStatusLabel = $derived(reviewWorkflowStatusLabel(workflowStatus))
  const revieweeId = $derived(String(detail.task.assigned_to ?? ''))
  const taskCreatorId = $derived(String(detail.task.creator_id ?? ''))
  const reviewCount = $derived(Number(workflow?.completed_review_count ?? 0))
  const requiredReviewCount = $derived(Number(workflow?.required_review_count ?? 2))
  const missingReviewCount = $derived(Math.max(0, requiredReviewCount - reviewCount))

  function reviewWorkflowStatusLabel(status: string): string {
    const labels: Record<string, [string, string]> = {
      awaiting_review: ['task.review_workflow.status.awaiting_review', 'Waiting for review'], in_review: ['task.review_workflow.status.in_review', 'In review'], awaiting_response: ['task.review_workflow.status.awaiting_response', 'Waiting for response'], disputed: ['task.review_workflow.status.disputed', 'Disputed'], reported: ['task.review_workflow.status.reported', 'Dispute reported'], ai_reviewing: ['task.review_workflow.status.ai_reviewing', 'AI reviewing'], admin_reviewing: ['task.review_workflow.status.admin_reviewing', 'Waiting for admin decision'], resolved: ['task.review_workflow.status.resolved', 'Resolved'], done: ['task.review_workflow.status.done', 'Done'],
    }
    const [key, fallback] = labels[status] ?? ['task.review_workflow.status.unknown', 'Unknown status']
    return t(key, {}, fallback)
  }

  function reviewMessageTypeLabel(type?: string): string {
    const labels: Record<string, [string, string]> = { review: ['task.review_workflow.message_type.review', 'Review'], reviewee_response: ['task.review_workflow.message_type.reviewee_response', 'Reviewee response'], dispute_reply: ['task.review_workflow.message_type.dispute_reply', 'Dispute discussion'], system: ['task.review_workflow.message_type.system', 'System'] }
    const [key, fallback] = labels[type ?? 'system'] ?? ['task.review_workflow.message_type.system', 'System']
    return t(key, {}, fallback)
  }

  function reviewerStatusLabel(status: Reviewer['status']): string {
    const labels: Record<Reviewer['status'], [string, string]> = {
      pending: ['task.review_workflow.reviewer_status.pending', 'Pending'],
      submitted: ['task.review_workflow.reviewer_status.submitted', 'Submitted'],
      waived: ['task.review_workflow.reviewer_status.waived', 'Waived'],
    }
    const [key, fallback] = labels[status]
    return t(key, {}, fallback)
  }
  function reviewerRoleLabel(role: string): string {
    const labels: Record<string, [string, string]> = {
      task_giver_required: ['task.review_workflow.reviewer_role.task_giver_required', 'Task giver'],
      project_member_reviewer: ['task.review_workflow.reviewer_role.project_member_reviewer', 'Project reviewer'],
    }
    const [key, fallback]: [string, string] = labels[role] ?? [
      'task.review_workflow.reviewer_role.project_member_reviewer',
      'Project reviewer',
    ]
    return t(key, {}, fallback)
  }

  function reviewMessageAuthorLabel(message: DetailUserMessage): string {
    return message.message_type === 'system'
      ? t('task.review_workflow.message_type.system', {}, 'System')
      : (message.author_name ?? message.author_id)
  }

  function reviewMessageBodyLabel(message: DetailUserMessage): string {
    if (message.message_type !== 'system') return message.body

    const normalizedBody = message.body.toLowerCase()
    if (normalizedBody.includes('dispute reported') || normalizedBody.includes('đã báo cáo tranh chấp')) {
      return t('task.review_workflow.system_event.dispute_reported', {}, 'A dispute report was sent.')
    }

    return message.body
  }
  const isReviewee = $derived(Boolean(currentUserId && revieweeId === currentUserId))
  const isReviewer = $derived(Boolean(detail.reviewers.some((reviewer) => reviewer.reviewer_id === currentUserId)))
  const canStartWorkflow = $derived(
    Boolean(!workflow && currentUserId && currentUserId === taskCreatorId && !isReviewee)
  )
  const canSubmitReview = $derived(
    Boolean(
      canStartWorkflow ||
        (currentUserId &&
          taskId &&
          !isReviewee &&
          workflow &&
          ['awaiting_review', 'in_review', 'awaiting_response'].includes(
            workflowStatus
          ))
    )
  )
  const reviewMessages = $derived(detail.reviewMessages.filter((message) => message.message_type === 'review'))
  const mySubmittedReview = $derived(
    detail.reviewMessages.find(
      (message) =>
        message.message_type === 'review' &&
        Boolean(currentUserId) &&
        message.author_id === currentUserId
    ) ?? null
  )
  const canCreateReview = $derived(Boolean(canSubmitReview && !mySubmittedReview))
  const canEditSubmittedReview = $derived(
    Boolean(
      mySubmittedReview &&
        isReviewer &&
        ['in_review', 'awaiting_response', 'disputed'].includes(workflowStatus)
    )
  )
  const hasResponse = (reviewMessageId: string) =>
    detail.reviewMessages.some(
      (message) =>
        message.message_type === 'reviewee_response' &&
        message.parent_review_message_id === reviewMessageId
    )
  const canRespondTo = (message: DetailUserMessage) =>
    Boolean(
      (isReviewee && workflowStatus === 'awaiting_response' && !hasResponse(message.id)) ||
        (workflowStatus === 'disputed' && message.reviewee_decision === 'rejected' && (isReviewee || (message.author_id === currentUserId && !message.reviewer_agreed_at)))
    )
  const isDisputeDiscussion = (message: DetailUserMessage) =>
    Boolean(workflowStatus === 'disputed' && message.reviewee_decision === 'rejected')
  const canReviewerConfirm = (message: DetailUserMessage) =>
    Boolean(message.requires_reviewer_confirmation && !message.reviewer_agreed_at && message.author_id === currentUserId)
  const canDecide = (message: DetailUserMessage) =>
    Boolean(isReviewee && ['awaiting_response', 'disputed'].includes(workflowStatus) && hasResponse(message.id) && message.reviewee_decision !== 'accepted')
  const canReportFor = (message: DetailUserMessage) =>
    Boolean(
      ['awaiting_response', 'disputed'].includes(workflowStatus) &&
        hasResponse(message.id) &&
        message.reviewee_decision !== 'accepted' &&
        (isReviewee || message.author_id === currentUserId)
    )
  const reviewAuthoringContext = $derived(detail.reviewAuthoringContext)
  const reviewPackageAvailable = $derived(
    reviewAuthoringContext?.['reviewPackageAvailable'] === true
  )
  const reviewPackageReportId = $derived(
    typeof reviewAuthoringContext?.['completionReportId'] === 'string'
      ? reviewAuthoringContext['completionReportId']
      : ''
  )
  const reviewPackageAssignmentId = $derived(
    typeof reviewAuthoringContext?.['taskAssignmentId'] === 'string'
      ? reviewAuthoringContext['taskAssignmentId']
      : ''
  )
  const reviewPackageKey = $derived(
    `${reviewPackageReportId}:${taskId}:${reviewPackageAssignmentId}`
  )
  const observationContext = $derived.by(() => {
    if (!reviewAuthoringContext || !reviewPackageAvailable || !reviewPackage) {
      return reviewPackageAvailable ? null : reviewAuthoringContext
    }
    return projectReviewPackageToObservationContext(reviewAuthoringContext, reviewPackage)
  })
  const documentLocale = $derived(currentDocumentLocale() === 'vi' ? 'vi-VN' : 'en-US')
  const dateTimeFormatter = $derived(
    new Intl.DateTimeFormat(documentLocale, {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  )

  $effect(() => {
    if (
      !reviewPackageAvailable ||
      !reviewPackageReportId ||
      !reviewPackageAssignmentId ||
      !taskId ||
      reviewPackageLoadKey === reviewPackageKey
    ) {
      return
    }

    reviewPackageLoadKey = reviewPackageKey
    reviewPackage = null
    reviewPackageError = ''
    reviewPackageLoading = true

    void loadReviewPackage(reviewPackageReportId, taskId, reviewPackageAssignmentId)
      .then((value) => {
        if (reviewPackageLoadKey !== reviewPackageKey) return
        if (!value) throw new Error('Review package was unavailable')
        reviewPackage = value
      })
      .catch(() => {
        if (reviewPackageLoadKey === reviewPackageKey) {
          reviewPackageError = t(
            'task.review_observation.package_load_failed',
            {},
            'The native review package could not be loaded. Observation authoring is disabled.'
          )
        }
      })
      .finally(() => {
        if (reviewPackageLoadKey === reviewPackageKey) reviewPackageLoading = false
      })
  })

  type ReviewActionErrors = Record<string, string | string[] | undefined>

  function extractActionError(errors: ReviewActionErrors): string {
    const message = errors.body ?? errors.reason ?? errors.message ?? Object.values(errors)[0]
    if (Array.isArray(message)) return message[0] ?? t('task.review_workflow.action_failed', {}, 'Review action failed. Please try again.')
    return message ?? t('task.review_workflow.action_failed', {}, 'Review action failed. Please try again.')
  }

  function mutationOptions(onSuccess?: () => void) {
    actionError = ''
    return {
      preserveScroll: true,
      preserveState: true,
      onError: (errors: ReviewActionErrors) => {
        actionError = extractActionError(errors)
      },
      ...(onSuccess ? { onSuccess } : {}),
    }
  }

  function submitReview() {
    if ((!canCreateReview && !editingReview) || reviewBody.trim().length === 0) return
    router.post(`/task-reviews/tasks/${taskId}/reviews`, {
      body: reviewBody.trim(),
      project_id: projectId ?? '',
      redirect_to: taskDetailUrl,
    }, mutationOptions(() => {
      editingReview = false
      reviewBody = ''
    }))
  }

  function beginEditReview() {
    if (!mySubmittedReview || !canEditSubmittedReview) return
    reviewBody = mySubmittedReview.body
    editingReview = true
  }

  function cancelEditReview() {
    editingReview = false
    reviewBody = ''
  }

  function decideReview(reviewMessageId: string, decision: 'accepted' | 'rejected') {
    if (!workflowId) return
    router.post(`/task-reviews/${workflowId}/accept`, {
      review_message_id: reviewMessageId,
      decision,
      project_id: projectId ?? '',
      task_id: taskId,
      redirect_to: taskDetailUrl,
    }, mutationOptions())
  }

  function respondReview(reviewMessageId: string) {
    if (!workflowId || responseBody.trim().length === 0) return
    router.post(`/task-reviews/${workflowId}/respond`, {
      body: responseBody.trim(),
      review_message_id: reviewMessageId,
      project_id: projectId ?? '',
      task_id: taskId,
      redirect_to: taskDetailUrl,
    }, mutationOptions())
  }

  function canEditResponse(message: DetailUserMessage): boolean {
    return Boolean(
      message.author_id === currentUserId &&
        ['reviewee_response', 'dispute_reply'].includes(message.message_type ?? '') &&
        ['awaiting_response', 'disputed'].includes(workflowStatus)
    )
  }

  function beginEditResponse(message: DetailUserMessage) {
    if (!canEditResponse(message)) return
    editingResponseMessageId = message.id
    responseBody = message.body
  }

  function cancelEditResponse() {
    editingResponseMessageId = null
    responseBody = ''
  }

  function updateResponse(message: DetailUserMessage) {
    if (!workflowId || responseBody.trim().length === 0) return
    router.post(`/task-reviews/${workflowId}/respond`, {
      body: responseBody.trim(),
      review_message_id: message.parent_review_message_id ?? '',
      response_message_id: message.id,
      project_id: projectId ?? '',
      task_id: taskId,
      redirect_to: taskDetailUrl,
    }, mutationOptions(() => cancelEditResponse()))
  }

  function canWithdrawMessage(message: DetailUserMessage): boolean {
    return Boolean(
      message.author_id === currentUserId &&
        ['review', 'reviewee_response', 'dispute_reply'].includes(message.message_type ?? '') &&
        ['awaiting_review', 'in_review', 'awaiting_response', 'disputed'].includes(workflowStatus)
    )
  }

  function withdrawMessage(message: DetailUserMessage) {
    if (!workflowId || !canWithdrawMessage(message)) return
    router.post(`/task-reviews/${workflowId}/respond`, {
      withdraw_message_id: message.id,
      project_id: projectId ?? '',
      task_id: taskId,
      redirect_to: taskDetailUrl,
    }, mutationOptions(() => {
      if (editingResponseMessageId === message.id) cancelEditResponse()
      if (message.message_type === 'review') cancelEditReview()
    }))
  }

  function reportDispute(reviewMessageId: string) {
    if (!workflowId || disputeClaim.trim().length < 10 || disputeEvidence.trim().length < 10) return
    router.post(`/task-reviews/${workflowId}/report`, {
      dispute_type: disputeType,
      claim: disputeClaim.trim(),
      evidence: disputeEvidence.trim(),
      requested_outcome: requestedOutcome,
      review_message_id: reviewMessageId,
      project_id: projectId ?? '',
      task_id: taskId,
      redirect_to: taskDetailUrl,
    }, mutationOptions())
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
      {reviewCount}/{requiredReviewCount} · {workflowStatusLabel}
    </div>
  </div>

  <div class="mt-4 space-y-4">
    {#if actionError}
      <p role="alert" class="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">
        {actionError}
      </p>
    {/if}

    <section>
      <h4 class="mb-2 text-sm font-black uppercase tracking-[0.14em] text-muted-foreground">
        {t('task.review_workflow.reviewers', {}, 'Reviewers')}
      </h4>
      <div class="space-y-2">
        {#each detail.reviewers as reviewer (reviewer.reviewer_id)}
          <div class="flex min-w-0 items-center justify-between gap-3 rounded-md border border-border bg-background px-3 py-2 text-sm">
            <span class="min-w-0 truncate">{reviewer.reviewer_name ?? reviewer.reviewer_id}</span>
            <span class="shrink-0 text-xs font-bold">{reviewerRoleLabel(reviewer.reviewer_role)} · {reviewerStatusLabel(reviewer.status)}</span>
          </div>
        {:else}
          <div class="rounded-md border border-dashed border-border bg-background/70 px-3 py-3 text-sm text-muted-foreground">
            {t('task.review_workflow.first_review_hint', {}, 'The first review creates the workflow and reviewer quorum.')}
          </div>
        {/each}
      </div>
      {#if missingReviewCount > 0}
        <p class="text-sm text-muted-foreground">
          {t('task.review_workflow.community_review_needed', { count: missingReviewCount }, `Need ${missingReviewCount} more project review${missingReviewCount === 1 ? '' : 's'}.`)}
        </p>
      {/if}
    </section>

    {#if canCreateReview || editingReview}
      <section class="space-y-2 border-t border-border pt-4">
        <label class="text-sm font-bold" for="task-review-body">
          {editingReview
            ? t('task.review_workflow.edit_review', {}, 'Edit review')
            : t('task.review_workflow.review_label', {}, 'Enter review')}
        </label>
        <textarea id="task-review-body" bind:value={reviewBody} class="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"></textarea>
        <div class="flex flex-wrap gap-2">
          <button type="button" class="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-bold text-primary-foreground" onclick={submitReview}>
            <Send class="h-4 w-4" />
            {editingReview
              ? t('task.review_workflow.update_review', {}, 'Update review')
              : t('task.review_workflow.send_review', {}, 'Send review')}
          </button>
          {#if editingReview}
            <button type="button" class="rounded-md border border-border bg-background px-3 py-2 text-sm font-bold" onclick={cancelEditReview}>
              {t('common.cancel', {}, 'Cancel')}
            </button>
          {/if}
        </div>
      </section>
    {/if}

    {#if isReviewer && workflowId}
      {#if reviewPackageAvailable && !reviewPackageReportId}
        <p role="alert" class="border-t border-border pt-4 text-sm font-semibold text-destructive">
          {t('task.review_observation.package_load_failed', {}, 'The native review package could not be loaded. Observation authoring is disabled.')}
        </p>
      {:else if reviewPackageAvailable && reviewPackageLoading}
        <p class="border-t border-border pt-4 text-sm text-muted-foreground">
          {t('task.review_observation.package_loading', {}, 'Loading the native review package...')}
        </p>
      {:else if reviewPackageAvailable && reviewPackageError}
        <p role="alert" class="border-t border-border pt-4 text-sm font-semibold text-destructive">{reviewPackageError}</p>
      {:else}
        <ReviewObservationAuthoringPanel
          {workflowId}
          {currentUserId}
          {taskId}
          {projectId}
          {taskDetailUrl}
          {translate}
          context={observationContext as never}
        />
      {/if}
    {/if}


    <section class="border-t border-border pt-4">
      <h4 class="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
        <MessageSquareText class="h-4 w-4" />
        {t('task.review_workflow.thread', {}, 'Review thread')}
      </h4>
      <div class="overflow-hidden rounded-lg border border-border bg-background">
        {#each reviewMessages as message (message.id)}
          <article class="border-b border-border px-4 py-4 last:border-b-0 sm:px-5">
            <header class="flex flex-wrap items-start justify-between gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span class="font-semibold text-foreground">{message.message_type === 'system' ? reviewMessageAuthorLabel(message) : `${reviewMessageAuthorLabel(message)} · ${reviewMessageTypeLabel(message.message_type)}`}</span>
              <span class="shrink-0">{#if (message.revision_count ?? 0) > 1}{t('task.review_workflow.edited_at', {}, 'Edited')} {formatDate(message.updated_at)}{:else}{formatDate(message.created_at)}{/if}</span>
            </header>
            <p class="mt-2 max-w-[75ch] whitespace-pre-wrap text-sm leading-6 text-foreground">{reviewMessageBodyLabel(message)}</p>
            {#if message.author_id === currentUserId && canEditSubmittedReview}
              <div class="mt-3 flex flex-wrap items-center gap-2">
                <button type="button" class="inline-flex min-h-8 items-center rounded-md px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary/10" onclick={beginEditReview}>
                  {t('task.review_workflow.edit_review', {}, 'Edit review')}
                </button>
                <button type="button" class="inline-flex min-h-8 items-center rounded-md px-2.5 py-1 text-xs font-semibold text-destructive hover:bg-destructive/10" onclick={() => withdrawMessage(message)}>
                  {t('task.review_workflow.delete_message', {}, 'Delete')}
                </button>
              </div>
            {/if}
            {#if message.reviewee_decision && !(message.requires_reviewer_confirmation && message.reviewee_decision === 'accepted')}
              <span class="mt-2 inline-flex rounded-full border px-2 py-0.5 text-xs font-bold {message.reviewee_decision === 'accepted' ? 'border-primary/30 bg-primary/10 text-primary' : 'border-destructive/30 bg-destructive/10 text-destructive'}">
                {message.reviewee_decision === 'accepted'
                  ? t('task.review_workflow.review_accepted', {}, 'Accepted by reviewee')
                  : t('task.review_workflow.review_rejected', {}, 'Disputed by reviewee')}
              </span>
            {/if}
            {#if message.reviewer_agreed_at}
              <span class="mt-2 inline-flex rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">{t('task.review_workflow.review_settlement_confirmed', {}, 'Both parties agreed')}</span>
            {:else if message.requires_reviewer_confirmation && message.reviewee_decision === 'accepted'}
              <span class="mt-2 inline-flex rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">{t('task.review_workflow.reviewee_settlement_confirmed', {}, 'Reviewee agreed — waiting for reviewer confirmation')}</span>
            {/if}
            {#each detail.reviewMessages.filter((candidate) => candidate.parent_review_message_id === message.id) as reply (reply.id)}
              <div class="mt-4 border-t border-border pt-3 text-sm">
                <div class="flex flex-wrap items-start justify-between gap-x-4 gap-y-1 text-xs text-muted-foreground"><span class="font-semibold text-foreground">{reply.message_type === 'system' ? reviewMessageAuthorLabel(reply) : `${reviewMessageAuthorLabel(reply)} · ${reviewMessageTypeLabel(reply.message_type)}`}</span><span>{formatDate(reply.created_at)}</span></div>
                <p class="mt-2 max-w-[75ch] whitespace-pre-wrap leading-6 text-foreground">{reviewMessageBodyLabel(reply)}</p>
                {#if (reply.revision_count ?? 0) > 1}
                  <details class="mt-2 rounded-md border border-border bg-muted/10 px-3 py-2">
                    <summary class="cursor-pointer text-xs font-bold text-foreground">{t('task.review_workflow.view_edit_history', {}, 'View edit history')}</summary>
                    {#each reply.revisions ?? [] as revision (revision.id)}
                      <p class="mt-2 text-xs text-muted-foreground">{t('task.review_workflow.revision_number', { number: revision.revision_number }, `Version ${revision.revision_number}`)} · {revision.body}</p>
                    {/each}
                  </details>
                {/if}
                {#if canEditResponse(reply)}
                  <div class="mt-2 flex flex-wrap items-center gap-2">
                    <button type="button" class="inline-flex min-h-8 items-center rounded-md px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary/10" onclick={() => beginEditResponse(reply)}>{t('task.review_workflow.edit_response', {}, 'Edit response')}</button>
                    <button type="button" class="inline-flex min-h-8 items-center rounded-md px-2.5 py-1 text-xs font-semibold text-destructive hover:bg-destructive/10" onclick={() => withdrawMessage(reply)}>{t('task.review_workflow.delete_message', {}, 'Delete')}</button>
                  </div>
                {/if}
                {#if editingResponseMessageId === reply.id}
                  <div class="mt-3 space-y-2 border-t border-border pt-3">
                    <label class="text-xs font-bold" for={`task-review-response-edit-${reply.id}`}>{t('task.review_workflow.edit_response', {}, 'Edit response')}</label>
                    <textarea id={`task-review-response-edit-${reply.id}`} bind:value={responseBody} class="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"></textarea>
                    <div class="flex flex-wrap gap-2"><button type="button" class="min-h-8 rounded-md bg-primary px-3 py-1 text-xs font-bold text-primary-foreground" onclick={() => updateResponse(reply)}>{t('task.review_workflow.update_response', {}, 'Update response')}</button><button type="button" class="min-h-8 rounded-md border border-border px-3 py-1 text-xs font-bold" onclick={cancelEditResponse}>{t('common.cancel', {}, 'Cancel')}</button></div>
                  </div>
                {/if}
              </div>
            {/each}
            {#if canRespondTo(message)}
              {#if activeResponseReviewId === message.id}
                <div class="mt-4 space-y-2 border-t border-border pt-3">
                  <label class="text-xs font-bold" for={`task-review-response-${message.id}`}>{isDisputeDiscussion(message) ? t('task.review_workflow.dispute_discussion_label', {}, 'Discussion in this dispute') : t('task.review_workflow.response_label', {}, 'Response to this review')}</label>
                  <textarea id={`task-review-response-${message.id}`} bind:value={responseBody} class="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"></textarea>
                  <button type="button" class="rounded-md border border-border bg-background px-3 py-2 text-xs font-bold" onclick={() => respondReview(message.id)}>{isDisputeDiscussion(message) ? t('task.review_workflow.send_dispute_discussion', {}, 'Send discussion reply') : t('task.review_workflow.send_response', {}, 'Send response')}</button>
                </div>
              {:else}
                <button type="button" class="mt-4 min-h-9 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-semibold hover:bg-muted/40" onclick={() => { activeResponseReviewId = message.id; activeReportReviewId = null; responseBody = '' }}>{isDisputeDiscussion(message) ? t('task.review_workflow.continue_dispute_discussion', {}, 'Continue dispute discussion') : t('task.review_workflow.respond_to_review', {}, 'Respond to this review')}</button>
              {/if}
            {/if}
            {#if canDecide(message) || canReviewerConfirm(message) || (canReportFor(message) && activeReportReviewId !== message.id)}
              <div class="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-3">
                {#if canDecide(message)}
                  <button type="button" class="inline-flex items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-bold text-primary-foreground" onclick={() => decideReview(message.id, 'accepted')}><CheckCircle2 class="h-3.5 w-3.5" />{message.reviewee_decision === 'rejected' ? t('task.review_workflow.accept_after_discussion', {}, 'Accept after discussion') : t('task.review_workflow.accept_this_review', {}, 'Accept this review')}</button>
                {#if message.reviewee_decision !== 'rejected'}
                  <button type="button" class="inline-flex items-center justify-center gap-1.5 rounded-md border border-destructive/30 px-3 py-2 text-xs font-bold text-destructive" onclick={() => decideReview(message.id, 'rejected')}><AlertTriangle class="h-3.5 w-3.5" />{t('task.review_workflow.dispute_this_review', {}, 'Dispute this review')}</button>
                {/if}
                {/if}
                {#if canReviewerConfirm(message)}
                  <button type="button" class="inline-flex items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-bold text-primary-foreground" onclick={() => decideReview(message.id, 'accepted')}><CheckCircle2 class="h-3.5 w-3.5" />{t('task.review_workflow.confirm_dispute_resolution', {}, 'Confirm resolution')}</button>
                {/if}
                {#if canReportFor(message) && activeReportReviewId !== message.id}
                  <button type="button" class="inline-flex items-center justify-center rounded-md border border-destructive/30 px-3 py-2 text-xs font-bold text-destructive" onclick={() => { activeReportReviewId = message.id; activeResponseReviewId = null; disputeType = 'review_fairness'; disputeClaim = ''; disputeEvidence = ''; requestedOutcome = 'reviewer_re_review' }}>{t('task.review_workflow.report_this_review', {}, 'Report this review')}</button>
                {/if}
              </div>
            {/if}
            {#if canReportFor(message)}
              {#if activeReportReviewId === message.id}
                <div class="mt-4 space-y-2 border-t border-destructive/30 pt-3">
                  <label class="flex items-center gap-2 text-xs font-bold" for={`task-review-report-${message.id}`}><AlertTriangle class="h-3.5 w-3.5" />{t('task.review_workflow.dispute_report_label', {}, 'Send dispute report')}</label>
                  <p class="text-xs text-muted-foreground">Đây là hồ sơ tranh chấp chính thức, không phải comment. Claim, căn cứ và nguyện vọng đều bắt buộc.</p>
                  <select aria-label="Dispute type" bind:value={disputeType} class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"><option value="deadline">Deadline quá gấp</option><option value="scope">Scope quá nặng</option><option value="missing_context">Thiếu context/quyền truy cập</option><option value="scope_change">Yêu cầu bị đổi sau khi giao</option><option value="review_fairness">Review không công bằng</option><option value="review_score">Điểm review không đúng</option><option value="other">Khác</option></select>
                  <textarea id={`task-review-report-${message.id}`} aria-label="Dispute claim" bind:value={disputeClaim} placeholder="Tôi phản đối điều gì?" class="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"></textarea>
                  <textarea aria-label="Dispute evidence" bind:value={disputeEvidence} placeholder="Nêu căn cứ: task package, review, mốc thời gian hoặc policy liên quan." class="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"></textarea>
                  <select aria-label="Requested outcome" bind:value={requestedOutcome} class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"><option value="task_giver_re_review">Yêu cầu người giao task xem lại</option><option value="reviewer_re_review">Yêu cầu reviewer xem lại</option><option value="independent_re_review">Yêu cầu reviewer độc lập</option><option value="adjust_scope_or_deadline">Điều chỉnh scope/deadline</option><option value="adjust_score">Điều chỉnh điểm</option><option value="keep_current_review">Giữ review hiện tại</option><option value="admin_review">Yêu cầu admin xem xét</option></select>
                  <button type="button" class="rounded-md bg-destructive px-3 py-2 text-xs font-bold text-destructive-foreground" onclick={() => reportDispute(message.id)}>{t('task.review_workflow.send_report', {}, 'Send report')}</button>
                </div>
              {/if}
            {/if}
          </article>
        {:else}
          <div class="rounded-md border border-dashed border-border bg-background/70 px-3 py-3 text-sm text-muted-foreground">
            {t('task.review_workflow.no_discussion', {}, 'No review discussion yet.')}
          </div>
        {/each}
      </div>
    </section>
  </div>
</section>
