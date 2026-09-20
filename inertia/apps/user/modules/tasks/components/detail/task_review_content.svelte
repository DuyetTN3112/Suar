<script lang="ts">
  import type { TaskCompletionReviewPackageProjection } from '@/apps/shared/reviews/task_completion_review_package'
  import TaskReviewCreationForm from './task_review_creation_form.svelte'
  import TaskReviewFinalizationBanner from './task_review_finalization_banner.svelte'
  import TaskReviewObservationSection from './task_review_observation_section.svelte'
  import TaskReviewReviewersSummary from './task_review_reviewers_summary.svelte'
  import TaskReviewThread from './task_review_thread.svelte'
  import type {
    DetailUserMessage,
    Reviewer,
    TaskReviewDetailPayload,
  } from './task_review_types.js'

  interface Props {
    reviewCount: number
    requiredReviewCount: number
    workflowStatusLabel: string
    workflowStatus: string
    actionError: string
    canFinalizeWorkflow: boolean
    finalizingWorkflow: boolean
    onFinalize: () => void
    detail: TaskReviewDetailPayload
    missingReviewCount: number
    reviewerRoleLabel: (role: string) => string
    reviewerStatusLabel: (status: Reviewer['status']) => string
    canCreateReview: boolean
    editingReview: boolean
    reviewBody: string
    onSubmitReview: () => void
    onCancelEditReview: () => void
    isReviewer: boolean
    workflowId: string
    currentUserId?: string | null
    taskId: string
    projectId?: string | null
    taskDetailUrl?: string
    translate?: (key: string, params?: Record<string, unknown>, fallback?: string) => string
    loadReviewPackage?: (reportId: string, taskId: string, assignmentId: string) => Promise<TaskCompletionReviewPackageProjection | null>
    reviewMessages: DetailUserMessage[]
    revieweeId: string
    mySubmittedReview: DetailUserMessage | null
    canEditSubmittedReview: boolean
    formatDate: (value: unknown) => string
    reviewMessageAuthorLabel: (message: DetailUserMessage) => string
    reviewMessageTypeLabel: (type?: string) => string
    reviewMessageBodyLabel: (message: DetailUserMessage) => string
    onBeginEditReview: () => void
    onUpdateReviewBody: (body: string) => void
    onWithdrawMessage: (message: DetailUserMessage) => void
    onDecideReview: (reviewMessageId: string, decision: 'accepted' | 'rejected') => void
    onRespondReview: (reviewMessageId: string, body: string) => void
    onUpdateResponse: (message: DetailUserMessage, body: string) => void
    onOpenDispute: (reviewMessageId: string) => void
    onReportDispute: (reviewMessageId: string, payload: { disputeType: string; claim: string; evidence: string; requestedOutcome: string }) => void
    t: (key: string, params?: Record<string, unknown>, fallback?: string) => string
  }

  let {
    reviewCount,
    requiredReviewCount,
    workflowStatusLabel,
    workflowStatus,
    actionError,
    canFinalizeWorkflow,
    finalizingWorkflow,
    onFinalize,
    detail,
    missingReviewCount,
    reviewerRoleLabel,
    reviewerStatusLabel,
    canCreateReview,
    editingReview,
    reviewBody = $bindable(),
    onSubmitReview,
    onCancelEditReview,
    isReviewer,
    workflowId,
    currentUserId,
    taskId,
    projectId,
    taskDetailUrl,
    translate,
    loadReviewPackage,
    reviewMessages,
    revieweeId,
    mySubmittedReview,
    canEditSubmittedReview,
    formatDate,
    reviewMessageAuthorLabel,
    reviewMessageTypeLabel,
    reviewMessageBodyLabel,
    onBeginEditReview,
    onUpdateReviewBody,
    onWithdrawMessage,
    onDecideReview,
    onRespondReview,
    onUpdateResponse,
    onOpenDispute,
    onReportDispute,
    t,
  }: Props = $props()
</script>

<section data-testid="review-workflow-content">
  <div class="flex flex-wrap items-center justify-between gap-3">
    <h3 class="text-base font-bold text-foreground">
      {t('task.review_workflow.title', {}, 'Review this task')}
    </h3>
    <div class="rounded-full border border-border bg-muted/30 px-3 py-1 text-xs font-bold text-foreground">
      {reviewCount}/{requiredReviewCount} · {workflowStatusLabel}
    </div>
  </div>

  <div class="mt-3 space-y-3">
    {#if actionError}
      <p role="alert" class="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">
        {actionError}
      </p>
    {/if}

    {#if workflowStatus === 'resolved'}
      <TaskReviewFinalizationBanner
        {canFinalizeWorkflow}
        {finalizingWorkflow}
        {onFinalize}
      />
    {/if}

    <TaskReviewReviewersSummary
      reviewers={detail.reviewers}
      {missingReviewCount}
      {reviewerRoleLabel}
      {reviewerStatusLabel}
    />

    {#if canCreateReview && !editingReview}
      <TaskReviewCreationForm
        bind:reviewBody
        {editingReview}
        {onSubmitReview}
        {onCancelEditReview}
      />
    {/if}

    <TaskReviewObservationSection
      {isReviewer}
      {workflowId}
      {currentUserId}
      {taskId}
      {projectId}
      {taskDetailUrl}
      {translate}
      reviewAuthoringContext={detail.reviewAuthoringContext}
      {loadReviewPackage}
      {t}
    />

    <TaskReviewThread
      {reviewMessages}
      allReviewMessages={detail.reviewMessages}
      currentUserId={currentUserId ?? null}
      {revieweeId}
      {workflowStatus}
      {mySubmittedReview}
      {canEditSubmittedReview}
      {editingReview}
      bind:reviewBody
      {formatDate}
      {reviewMessageAuthorLabel}
      {reviewMessageTypeLabel}
      {reviewMessageBodyLabel}
      {onBeginEditReview}
      {onCancelEditReview}
      {onSubmitReview}
      {onUpdateReviewBody}
      {onWithdrawMessage}
      {onDecideReview}
      {onRespondReview}
      {onUpdateResponse}
      {onOpenDispute}
      {onReportDispute}
    />
  </div>
</section>
