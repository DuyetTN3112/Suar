<script lang="ts">
  import { router } from '@inertiajs/svelte'
  import { Send } from 'lucide-svelte'
  import { currentDocumentLocale } from '@/apps/org/shared/lib/date_locale'
  import { useTranslation } from '@/apps/org/shared/hooks/use_translation.svelte'
  import ReviewObservationAuthoringPanel from '@/apps/shared/components/review_observation_authoring_panel.svelte'
  import {
    loadTaskCompletionReviewPackage,
    projectReviewPackageToObservationContext,
  } from '@/apps/shared/reviews/task_completion_review_package'
  import type { TaskCompletionReviewPackageProjection } from '@/apps/shared/reviews/task_completion_review_package'
  import {
    extractActionError,
    reviewerRoleLabel,
    reviewerStatusLabel,
    reviewWorkflowStatusLabel,
    type ReviewActionErrors,
  } from './task_review_helpers.js'
  import TaskReviewThread from './task_review_thread.svelte'
  import type { DetailUserMessage, TaskReviewWorkflowPanelProps } from './task_review_types.js'

  const {
    taskId,
    projectId,
    currentUserId,
    taskDetailUrl,
    detail,
    translate,
    loadReviewPackage = loadTaskCompletionReviewPackage,
  }: TaskReviewWorkflowPanelProps = $props()
  const { t } = useTranslation()

  let reviewBody = $state('')
  let editingReview = $state(false)
  let actionError = $state('')
  let reviewPackage = $state<TaskCompletionReviewPackageProjection | null>(null)
  let reviewPackageLoading = $state(false)
  let reviewPackageError = $state('')
  let reviewPackageLoadKey = $state('')

  const workflow = $derived(detail.workflow)
  const workflowId = $derived(String(workflow?.id ?? ''))
  const workflowStatus = $derived(String(workflow?.status ?? 'awaiting_review'))
  const workflowStatusLabel = $derived(reviewWorkflowStatusLabel(workflowStatus, t))
  const revieweeId = $derived(String(detail.task.assigned_to ?? ''))
  const taskCreatorId = $derived(String(detail.task.creator_id ?? ''))
  const reviewCount = $derived(Number(workflow?.completed_review_count ?? 0))
  const requiredReviewCount = $derived(Number(workflow?.required_review_count ?? 2))
  const missingReviewCount = $derived(Math.max(0, requiredReviewCount - reviewCount))

  const isReviewee = $derived(Boolean(currentUserId && revieweeId === currentUserId))
  const isReviewer = $derived(
    Boolean(detail.reviewers.some((reviewer) => reviewer.reviewer_id === currentUserId))
  )
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
          ['awaiting_review', 'in_review', 'awaiting_response'].includes(workflowStatus))
    )
  )
  const reviewMessages = $derived(
    detail.reviewMessages.filter((message) => message.message_type === 'review')
  )
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

  const reviewAuthoringContext = $derived(detail.reviewAuthoringContext)
  const reviewPackageAvailable = $derived(reviewAuthoringContext?.['reviewPackageAvailable'] === true)
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
  const reviewPackageKey = $derived(`${reviewPackageReportId}:${taskId}:${reviewPackageAssignmentId}`)
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

  function mutationOptions(onSuccess?: () => void) {
    actionError = ''
    return {
      preserveScroll: true,
      preserveState: true,
      onError: (errors: ReviewActionErrors) => {
        actionError = extractActionError(errors, t)
      },
      ...(onSuccess ? { onSuccess } : {}),
    }
  }

  function submitReview() {
    if ((!canCreateReview && !editingReview) || reviewBody.trim().length === 0) return
    router.post(
      `/task-reviews/tasks/${taskId}/reviews`,
      {
        body: reviewBody.trim(),
        project_id: projectId ?? '',
        redirect_to: taskDetailUrl,
      },
      mutationOptions(() => {
        editingReview = false
        reviewBody = ''
      })
    )
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
    router.post(
      `/task-reviews/${workflowId}/accept`,
      {
        review_message_id: reviewMessageId,
        decision,
        project_id: projectId ?? '',
        task_id: taskId,
        redirect_to: taskDetailUrl,
      },
      mutationOptions()
    )
  }

  function respondReview(reviewMessageId: string, body: string) {
    if (!workflowId || body.length === 0) return
    router.post(
      `/task-reviews/${workflowId}/respond`,
      {
        body,
        review_message_id: reviewMessageId,
        project_id: projectId ?? '',
        task_id: taskId,
        redirect_to: taskDetailUrl,
      },
      mutationOptions()
    )
  }

  function updateResponse(message: DetailUserMessage, body: string) {
    if (!workflowId || body.length === 0) return
    router.post(
      `/task-reviews/${workflowId}/respond`,
      {
        body,
        review_message_id: message.parent_review_message_id ?? '',
        response_message_id: message.id,
        project_id: projectId ?? '',
        task_id: taskId,
        redirect_to: taskDetailUrl,
      },
      mutationOptions()
    )
  }

  function withdrawMessage(message: DetailUserMessage) {
    if (!workflowId) return
    router.post(
      `/task-reviews/${workflowId}/respond`,
      {
        withdraw_message_id: message.id,
        project_id: projectId ?? '',
        task_id: taskId,
        redirect_to: taskDetailUrl,
      },
      mutationOptions(() => {
        if (message.message_type === 'review') cancelEditReview()
      })
    )
  }

  function reportDispute(
    reviewMessageId: string,
    payload: {
      disputeType: string
      claim: string
      evidence: string
      requestedOutcome: string
    }
  ) {
    if (!workflowId) return
    router.post(
      `/task-reviews/${workflowId}/report`,
      {
        dispute_type: payload.disputeType,
        claim: payload.claim,
        evidence: payload.evidence,
        requested_outcome: payload.requestedOutcome,
        review_message_id: reviewMessageId,
        project_id: projectId ?? '',
        task_id: taskId,
        redirect_to: taskDetailUrl,
      },
      mutationOptions()
    )
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
            <span class="shrink-0 text-xs font-bold">{reviewerRoleLabel(reviewer.reviewer_role, t)} · {reviewerStatusLabel(reviewer.status, t)}</span>
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

    <TaskReviewThread
      {reviewMessages}
      allReviewMessages={detail.reviewMessages}
      {currentUserId}
      {workflowStatus}
      {isReviewee}
      {canEditSubmittedReview}
      {formatDate}
      onBeginEditReview={beginEditReview}
      onWithdrawMessage={withdrawMessage}
      onDecideReview={decideReview}
      onRespondReview={respondReview}
      onUpdateResponse={updateResponse}
      onReportDispute={reportDispute}
    />
  </div>
</section>
