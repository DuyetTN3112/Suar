<script lang="ts">
  import { currentDocumentLocale } from '@/apps/user/shared/lib/date_locale'
  import { useTranslation } from '@/apps/user/shared/hooks/use_translation.svelte'
  import { loadTaskCompletionReviewPackage } from '@/apps/shared/reviews/task_completion_review_package'
  import TaskDetailFrame from '@/apps/user/modules/tasks/components/detail/task_detail_frame.svelte'
  import {
    submitReviewAction,
    decideReviewAction,
    respondReviewAction,
    openDisputeAction,
    updateResponseAction,
    withdrawMessageAction,
    reportDisputeAction,
    finalizeWorkflowAction,
  } from './task_review_actions.js'
  import TaskReviewContent from './task_review_content.svelte'
  import TaskReviewHeader from './task_review_header.svelte'
  import {
    extractActionError,
    loadCanonicalTaskDetail,
    mergeCanonicalTask,
    reviewMessageAuthorLabel as getReviewMessageAuthorLabel,
    reviewMessageBodyLabel as getReviewMessageBodyLabel,
    reviewMessageTypeLabel as getReviewMessageTypeLabel,
    reviewerRoleLabel as getReviewerRoleLabel,
    reviewerStatusLabel as getReviewerStatusLabel,
    reviewWorkflowStatusLabel as getReviewWorkflowStatusLabel,
    type ReviewActionErrors,
  } from './task_review_helpers.js'
  import TaskReviewMetadataSidebar from './task_review_metadata_sidebar.svelte'
  import type {
    DetailUserMessage,
    Reviewer,
    TaskReviewWorkflowPanelProps,
  } from './task_review_types.js'
  import {
    resolveReviewPermissions,
    resolveTaskDisplayProperties,
  } from './task_review_view_model.js'

  const {
    taskId,
    projectId,
    currentUserId,
    taskDetailUrl,
    detail,
    translate,
    showOrganizationContext = false,
    initialTab = 'review',
    canFinalizeResolvedWorkflow = false,
    loadTaskDetail = loadCanonicalTaskDetail,
    loadReviewPackage = loadTaskCompletionReviewPackage,
  }: TaskReviewWorkflowPanelProps = $props()
  const { t } = useTranslation()

  let reviewBody = $state('')
  let editingReview = $state(false)
  let actionError = $state('')
  let finalizingWorkflow = $state(false)
  let canonicalTask = $state<Record<string, unknown> | null>(null)
  let canonicalTaskLoadKey = $state('')
  let activeReviewTab = $state<'context' | 'review'>('review')
  let initialTabApplied = $state(false)
  const visibleReviewTab = $derived(initialTabApplied ? activeReviewTab : initialTab)

  $effect.pre(() => {
    if (initialTabApplied) return
    activeReviewTab = initialTab
    initialTabApplied = true
  })

  const workflow = $derived(detail.workflow)
  const workflowId = $derived(String(workflow?.id ?? ''))
  const workflowStatus = $derived(String(workflow?.status ?? 'awaiting_review'))
  const workflowStatusLabel = $derived(getReviewWorkflowStatusLabel(workflowStatus, t))
  const sourceTask = $derived.by(() => mergeCanonicalTask(detail.task, canonicalTask))
  const revieweeId = $derived(String(sourceTask.assigned_to ?? ''))
  const taskCreatorId = $derived(String(sourceTask.creator_id ?? ''))
  const reviewCount = $derived(Number(workflow?.completed_review_count ?? 0))
  const requiredReviewCount = $derived(Number(workflow?.required_review_count ?? 2))
  const missingReviewCount = $derived(Math.max(0, requiredReviewCount - reviewCount))
  const canFinalizeWorkflow = $derived(
    Boolean(canFinalizeResolvedWorkflow && workflowId && workflowStatus === 'resolved')
  )

  function reviewerStatusLabel(status: Reviewer['status']): string {
    return getReviewerStatusLabel(status, t)
  }

  function reviewerRoleLabel(role: string): string {
    return getReviewerRoleLabel(role, t)
  }

  const mySubmittedReview = $derived(
    detail.reviewMessages.find(
      (message) =>
        message.message_type === 'review' &&
        Boolean(currentUserId) &&
        message.author_id === currentUserId
    ) ?? null
  )

  const reviewPermissions = $derived(
    resolveReviewPermissions({
      currentUserId,
      revieweeId,
      taskCreatorId,
      workflow,
      workflowStatus,
      taskId,
      reviewers: detail.reviewers,
      hasSubmittedReview: Boolean(mySubmittedReview),
    })
  )

  const isReviewer = $derived(reviewPermissions.isReviewer)
  const canCreateReview = $derived(reviewPermissions.canCreateReview)
  const canEditSubmittedReview = $derived(reviewPermissions.canEditSubmittedReview)
  const reviewMessages = $derived(detail.reviewMessages.filter((message) => message.message_type === 'review'))

  const documentLocale = $derived(currentDocumentLocale() === 'vi' ? 'vi-VN' : 'en-US')
  const dateTimeFormatter = $derived(
    new Intl.DateTimeFormat(documentLocale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  )

  const displayProps = $derived(
    resolveTaskDisplayProperties({
      sourceTask,
      detail,
      taskId,
      projectId,
      revieweeId,
      taskCreatorId,
      dateTimeFormatter,
      t,
    })
  )

  $effect(() => {
    if (
      showOrganizationContext ||
      activeReviewTab !== 'context' ||
      !taskId ||
      canonicalTaskLoadKey === taskId
    ) {
      return
    }
    canonicalTaskLoadKey = taskId
    canonicalTask = null
    void loadTaskDetail(taskId)
      .then((loadedTask) => {
        if (loadedTask) canonicalTask = loadedTask
      })
      .catch(() => {
        // Fallback to review projection
      })
  })

  const mutationDispatchOptions = $derived({
    onError: (msg: string) => { actionError = msg },
    extractActionError: (errors: ReviewActionErrors) => extractActionError(errors, t),
  })

  const workflowActionContext = $derived({
    workflowId,
    taskId,
    projectId: projectId ?? undefined,
    taskDetailUrl,
  })

  function submitReview() {
    if ((!canCreateReview && !editingReview) || reviewBody.trim().length === 0) return
    submitReviewAction(
      { taskId, projectId, taskDetailUrl, body: reviewBody },
      {
        ...mutationDispatchOptions,
        onSuccess: () => {
          editingReview = false
          reviewBody = ''
        },
      }
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
    decideReviewAction(workflowActionContext, reviewMessageId, decision, mutationDispatchOptions)
  }

  function respondReview(reviewMessageId: string, body: string) {
    respondReviewAction(workflowActionContext, reviewMessageId, body, mutationDispatchOptions)
  }

  function openDispute(reviewMessageId: string) {
    const responseMessageId = detail.reviewMessages.find(
      (message) =>
        message.message_type === 'reviewee_response' &&
        message.parent_review_message_id === reviewMessageId
    )?.id
    openDisputeAction(workflowActionContext, reviewMessageId, responseMessageId, mutationDispatchOptions)
  }

  function updateResponse(message: DetailUserMessage, body: string) {
    updateResponseAction(workflowActionContext, message, body, mutationDispatchOptions)
  }

  function withdrawMessage(message: DetailUserMessage) {
    withdrawMessageAction(workflowActionContext, message, {
      ...mutationDispatchOptions,
      onSuccess: () => {
        if (message.message_type === 'review') cancelEditReview()
      },
    })
  }

  function reportDispute(reviewMessageId: string, payload: {
    disputeType: string
    claim: string
    evidence: string
    requestedOutcome: string
  }) {
    reportDisputeAction(workflowActionContext, reviewMessageId, payload, mutationDispatchOptions)
  }

  async function finalizeResolvedWorkflow() {
    if (!canFinalizeWorkflow || finalizingWorkflow) return
    actionError = ''
    finalizingWorkflow = true
    try {
      const res = await finalizeWorkflowAction(workflowId, {
        extractActionError: (errors) => extractActionError(errors, t),
        defaultErrorMessage: t('task.review_workflow.action_failed', {}, 'Review action failed. Please try again.'),
      })
      if (!res.success && res.error) {
        actionError = res.error
      }
    } finally {
      finalizingWorkflow = false
    }
  }

  function formatDate(value: unknown): string {
    return displayProps.formatDate(value)
  }

  function reviewMessageAuthorLabel(message: DetailUserMessage): string {
    return getReviewMessageAuthorLabel(message, t)
  }

  function reviewMessageTypeLabel(type?: string): string {
    return getReviewMessageTypeLabel(type, t)
  }

  function reviewMessageBodyLabel(message: DetailUserMessage): string {
    return getReviewMessageBodyLabel(message, t)
  }

  function updateReviewBody(body: string): void {
    reviewBody = body
  }
</script>

<div class="flex h-full min-h-0 flex-col bg-background" data-demo-section="task-review-workflow">
  {#if visibleReviewTab === 'context'}
    <TaskDetailFrame
      task={displayProps.reviewTask}
      metadata={displayProps.reviewMetadata}
      {currentUserId}
      workSurfacePermissions={{ canComment: Boolean(currentUserId), canOpenWorkTabs: true }}
      actionLabel={t('task.review_workflow.tab_title', {}, 'Reviews & disputes')}
      onAction={() => { activeReviewTab = 'review' }}
      lockedMessage={t('task.edit.locked_after_review', {}, 'Task locked after review')}
    />
  {:else}
    <TaskReviewHeader
      {taskId}
      taskTitle={displayProps.taskTitle}
      {t}
      onViewContext={() => { activeReviewTab = 'context' }}
    />
    <div class="min-h-0 flex-1 overflow-y-auto md:grid md:grid-cols-[minmax(0,1fr)_280px] md:overflow-hidden">
      <main class="min-w-0 p-5 md:overflow-y-auto" data-testid="review-task-context">
        <TaskReviewContent
          {reviewCount}
          {requiredReviewCount}
          {workflowStatusLabel}
          {workflowStatus}
          {actionError}
          {canFinalizeWorkflow}
          {finalizingWorkflow}
          onFinalize={finalizeResolvedWorkflow}
          {detail}
          {missingReviewCount}
          {reviewerRoleLabel}
          {reviewerStatusLabel}
          {canCreateReview}
          {editingReview}
          bind:reviewBody
          onSubmitReview={submitReview}
          onCancelEditReview={cancelEditReview}
          {isReviewer}
          {workflowId}
          currentUserId={currentUserId ?? undefined}
          {taskId}
          projectId={projectId ?? undefined}
          {taskDetailUrl}
          {translate}
          {loadReviewPackage}
          {reviewMessages}
          {revieweeId}
          {mySubmittedReview}
          {canEditSubmittedReview}
          {formatDate}
          {reviewMessageAuthorLabel}
          {reviewMessageTypeLabel}
          {reviewMessageBodyLabel}
          onBeginEditReview={beginEditReview}
          onUpdateReviewBody={updateReviewBody}
          onWithdrawMessage={withdrawMessage}
          onDecideReview={decideReview}
          onRespondReview={respondReview}
          onUpdateResponse={updateResponse}
          onOpenDispute={openDispute}
          onReportDispute={reportDispute}
          {t}
        />
      </main>

      <TaskReviewMetadataSidebar
        taskStatus={displayProps.taskStatus}
        taskPriority={displayProps.taskPriority}
        taskLabel={displayProps.taskLabel}
        taskDifficulty={displayProps.taskDifficulty}
        taskAssignee={displayProps.taskAssignee}
        taskDueDate={displayProps.taskDueDate}
        deliveryTiming={displayProps.deliveryTiming}
        assignmentCompletedAt={displayProps.assignmentCompletedAt}
        taskEstimatedTime={displayProps.taskEstimatedTime}
        taskActualTime={displayProps.taskActualTime}
        taskVisibility={displayProps.taskVisibility}
        taskCreatedAt={displayProps.taskCreatedAt}
        taskUpdatedAt={displayProps.taskUpdatedAt}
        taskCreator={displayProps.taskCreator}
      />
    </div>
  {/if}
</div>
