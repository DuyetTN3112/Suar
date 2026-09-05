<script lang="ts">
  import { router } from '@inertiajs/svelte'
  import axios from 'axios'
  import {
    AlertTriangle,
    CalendarDays,
    CheckCircle2,
    CircleAlert,
    Clock3,
    Eye,
    History,
    MessageSquareText,
    Send,
    Sparkles,
    Tag,
    UserRound,
  } from 'lucide-svelte'
  import { currentDocumentLocale } from '@/apps/user/shared/lib/date_locale'
  import { getTaskVisibilityLabel } from '@/apps/user/modules/tasks/lib/rules/task_visibility'
  import { useTranslation } from '@/apps/user/shared/hooks/use_translation.svelte'
  import ReviewObservationAuthoringPanel from '@/apps/shared/components/review_observation_authoring_panel.svelte'
  import {
    loadTaskCompletionReviewPackage,
    projectReviewPackageToObservationContext,
  } from '@/apps/shared/reviews/task_completion_review_package'
  import type { TaskCompletionReviewPackageProjection } from '@/apps/shared/reviews/task_completion_review_package'
  import TaskDiscussionTab from '@/apps/user/modules/tasks/components/detail/task_discussion_tab.svelte'
  import TaskExecutionBrief from '@/apps/user/modules/tasks/components/detail/task_execution_brief.svelte'
  import TaskDetailFrame from '@/apps/user/modules/tasks/components/detail/task_detail_frame.svelte'
  import type { TaskDetail, TaskMetadata } from '@/apps/user/modules/tasks/types/index.svelte'

  interface ReviewMessageRevision {
    id: string
    revision_number: number
    body: string
    editor_id: string
    editor_name: string | null
    created_at: string
  }

  interface DetailUserMessage {
    id: string
    body: string
    created_at: string
    updated_at?: string | null
    author_id: string
    author_name: string | null
    message_type?: string
    parent_review_message_id?: string | null
    reviewee_decision?: 'accepted' | 'rejected' | null
    requires_reviewer_confirmation?: boolean
    reviewer_agreed_at?: string | null
    revision_count?: number
    revisions?: ReviewMessageRevision[]
  }

  interface Reviewer {
    reviewer_id: string
    reviewer_name: string | null
    reviewer_role: string
    status: 'pending' | 'submitted' | 'waived'
    priority_rank: number
  }

  async function loadCanonicalTaskDetail(taskId: string): Promise<Record<string, unknown> | null> {
    const response = await axios.get<{ data?: unknown }>(`/api/v1/tasks/${encodeURIComponent(taskId)}`)
    const payload = response.data?.data ?? response.data
    return payload && typeof payload === 'object' && !Array.isArray(payload)
      ? (payload as Record<string, unknown>)
      : null
  }

  interface TaskReviewWorkflowDetail {
    task: Record<string, unknown>
    assignment?: Record<string, unknown> | null
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
    showOrganizationContext?: boolean
    initialTab?: 'context' | 'review'
    canFinalizeResolvedWorkflow?: boolean
    loadTaskDetail?: (taskId: string) => Promise<Record<string, unknown> | null>
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
    showOrganizationContext = false,
    initialTab = 'review',
    canFinalizeResolvedWorkflow = false,
    loadTaskDetail = loadCanonicalTaskDetail,
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
  let finalizingWorkflow = $state(false)
  let reviewPackage = $state<TaskCompletionReviewPackageProjection | null>(null)
  let reviewPackageLoading = $state(false)
  let reviewPackageError = $state('')
  let reviewPackageLoadKey = $state('')
  let canonicalTask = $state<Record<string, unknown> | null>(null)
  let canonicalTaskLoadKey = $state('')
  // Render the requested surface immediately. Starting in the legacy review
  // branch and switching via an effect caused members to briefly (and in some
  // hydration paths permanently) see the old task-detail layout.
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
  const workflowStatusLabel = $derived(reviewWorkflowStatusLabel(workflowStatus))
  const sourceTask = $derived.by(() => {
    const merged = { ...detail.task, ...(canonicalTask ?? {}) }
    const reviewBrief = detail.task.resolved_brief
    const canonicalBrief = canonicalTask?.resolved_brief
    const canonicalHasContract =
      canonicalBrief &&
      typeof canonicalBrief === 'object' &&
      'resolvedContract' in canonicalBrief &&
      Boolean((canonicalBrief as { resolvedContract?: unknown }).resolvedContract)

    // A member can hydrate the generic task metadata but receive a restricted
    // brief there. Never let that restricted response erase the published
    // review contract already supplied by the review board projection.
    if (reviewBrief && !canonicalHasContract) {
      merged.resolved_brief = reviewBrief
    }
    if (detail.task.required_skills_rel && (!canonicalTask?.required_skills_rel || (canonicalTask.required_skills_rel as unknown[]).length === 0)) {
      merged.required_skills_rel = detail.task.required_skills_rel
    }
    return merged
  })
  const revieweeId = $derived(String(sourceTask.assigned_to ?? ''))
  const taskCreatorId = $derived(String(sourceTask.creator_id ?? ''))
  const reviewCount = $derived(Number(workflow?.completed_review_count ?? 0))
  const requiredReviewCount = $derived(Number(workflow?.required_review_count ?? 2))
  const missingReviewCount = $derived(Math.max(0, requiredReviewCount - reviewCount))
  const canFinalizeWorkflow = $derived(
    Boolean(canFinalizeResolvedWorkflow && workflowId && workflowStatus === 'resolved')
  )

  function reviewWorkflowStatusLabel(status: string): string {
    const labels: Record<string, [string, string]> = {
      awaiting_review: ['task.review_workflow.status.awaiting_review', 'Waiting for review'],
      in_review: ['task.review_workflow.status.in_review', 'In review'],
      awaiting_response: ['task.review_workflow.status.awaiting_response', 'Waiting for response'],
      disputed: ['task.review_workflow.status.disputed', 'Disputed'],
      reported: ['task.review_workflow.status.reported', 'Dispute reported'],
      ai_reviewing: ['task.review_workflow.status.ai_reviewing', 'AI reviewing'],
      admin_reviewing: ['task.review_workflow.status.admin_reviewing', 'Waiting for admin decision'],
      resolved: ['task.review_workflow.status.resolved', 'Resolved'],
      done: ['task.review_workflow.status.done', 'Done'],
    }
    const [key, fallback] = labels[status] ?? ['task.review_workflow.status.unknown', 'Unknown status']
    return t(key, {}, fallback)
  }

  function reviewMessageTypeLabel(type?: string): string {
    const labels: Record<string, [string, string]> = {
      review: ['task.review_workflow.message_type.review', 'Review'],
      reviewee_response: ['task.review_workflow.message_type.reviewee_response', 'Reviewee response'],
      dispute_reply: ['task.review_workflow.message_type.dispute_reply', 'Dispute discussion'],
      system: ['task.review_workflow.message_type.system', 'System'],
    }
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
  const reviewMessages = $derived(detail.reviewMessages.filter((message) => message.message_type === 'review'))
  const hasResponse = (reviewMessageId: string) =>
    detail.reviewMessages.some(
      (message) =>
        message.message_type === 'reviewee_response' &&
        message.parent_review_message_id === reviewMessageId
    )
  const canRespondTo = (message: DetailUserMessage) =>
    Boolean(
      (isReviewee && workflowStatus === 'awaiting_response' && !hasResponse(message.id)) ||
        (workflowStatus === 'disputed' &&
          hasResponse(message.id) &&
          (isReviewee || (message.author_id === currentUserId && !message.reviewer_agreed_at)))
    )
  const isDisputeDiscussion = (message: DetailUserMessage) =>
    Boolean(workflowStatus === 'disputed' && hasResponse(message.id))
  const canOpenDispute = (message: DetailUserMessage) =>
    Boolean(
      workflowStatus === 'awaiting_response' &&
        hasResponse(message.id) &&
        message.reviewee_decision !== 'accepted' &&
        (isReviewee || message.author_id === currentUserId)
    )
  const canReviewerConfirm = (message: DetailUserMessage) =>
    Boolean(
      ['awaiting_response', 'disputed'].includes(workflowStatus) &&
        hasResponse(message.id) &&
        message.reviewee_decision !== 'rejected' &&
        !message.reviewer_agreed_at &&
        message.author_id === currentUserId
    )
  const canDecide = (message: DetailUserMessage) =>
    Boolean(
      isReviewee &&
        ['awaiting_response', 'disputed'].includes(workflowStatus) &&
        hasResponse(message.id) &&
        message.reviewee_decision !== 'accepted'
    )
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
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  )
  const taskTitle = $derived(String(sourceTask.title ?? t('task.review_workflow.untitled_task', {}, 'Untitled task')))
  const taskDescription = $derived(String(sourceTask.description ?? ''))
  const taskStatus = $derived(String(sourceTask.status ?? '—'))
  const taskStatusId = $derived(String(sourceTask.task_status_id ?? taskStatus))
  const taskPriority = $derived(String(sourceTask.priority ?? '—'))
  const taskDifficulty = $derived(String(sourceTask.difficulty ?? '—'))
  const taskAssignee = $derived(String(sourceTask.assignee_name ?? sourceTask.assigned_to ?? '—'))
  const taskCreator = $derived(String(sourceTask.creator_name ?? sourceTask.creator_id ?? '—'))
  const taskDueDate = $derived(formatDate(sourceTask.due_date))
  const taskLabel = $derived(String(sourceTask.label ?? '—'))
  const taskEstimatedTime = $derived(formatHours(detail.assignment?.estimated_hours ?? sourceTask.estimated_time))
  const taskActualTime = $derived(formatHours(detail.assignment?.actual_hours ?? sourceTask.actual_time))
  const taskVisibility = $derived(
    getTaskVisibilityLabel(String(sourceTask.task_visibility ?? sourceTask.visibility ?? ''), t)
  )
  const taskCreatedAt = $derived(formatDate(sourceTask.created_at))
  const taskUpdatedAt = $derived(formatDate(sourceTask.updated_at))
  const assignmentCompletedAt = $derived(formatDate(detail.assignment?.completed_at))
  const taskAcceptanceCriteria = $derived(String(sourceTask.acceptance_criteria ?? ''))
  const taskContextBackground = $derived(String(sourceTask.context_background ?? ''))
  const organizationName = $derived(String(sourceTask.organization_name ?? ''))
  const projectName = $derived(String(sourceTask.project_name ?? ''))
  const organizationDescription = $derived(String(sourceTask.organization_description ?? ''))
  const projectDescription = $derived(String(sourceTask.project_description ?? ''))
  const projectStatus = $derived(String(sourceTask.project_status ?? ''))
  const taskComments = $derived(
    (detail.comments ?? []).map((comment) => ({
      id: comment.id,
      body: comment.body,
      createdAt: comment.created_at,
      authorId: comment.author_id,
      authorUsername: comment.author_name,
      commentType: comment.message_type ?? 'normal',
      visibility: 'internal',
    }))
  )
  const taskVerificationMethods = $derived(toDisplayLines(sourceTask.verification_method))
  const taskExpectedDeliverables = $derived(toDisplayLines(sourceTask.expected_deliverables))
  const deliveryTiming = $derived.by(() => getDeliveryTiming(sourceTask.due_date, detail.assignment?.completed_at))
  // The review board deliberately renders the same read surface as the task
  // board. The review projection is adapted here, rather than maintaining a
  // second, visually similar task-detail implementation.
  const reviewTask = $derived({
    ...sourceTask,
    id: taskId,
    title: taskTitle,
    description: taskDescription,
    status: taskStatus,
    task_status_id: taskStatusId,
    label: taskLabel,
    priority: taskPriority,
    assigned_to: revieweeId || null,
    creator_id: taskCreatorId,
    due_date: typeof sourceTask.due_date === 'string' ? sourceTask.due_date : null,
    created_at: typeof sourceTask.created_at === 'string' ? sourceTask.created_at : '',
    updated_at: typeof sourceTask.updated_at === 'string' ? sourceTask.updated_at : '',
    organization_id: String(sourceTask.organization_id ?? ''),
    project_id: projectId ?? String(sourceTask.project_id ?? ''),
    assignee: revieweeId ? { id: revieweeId, username: taskAssignee, email: '' } : undefined,
    creator: taskCreatorId ? { id: taskCreatorId, username: taskCreator, email: '' } : undefined,
    organization: organizationName ? { id: String(sourceTask.organization_id ?? ''), name: organizationName } : undefined,
    project: projectName ? { id: projectId ?? String(sourceTask.project_id ?? ''), name: projectName } : undefined,
    estimated_time: Number(detail.assignment?.estimated_hours ?? sourceTask.estimated_time) || undefined,
    actual_time: Number(detail.assignment?.actual_hours ?? sourceTask.actual_time) || undefined,
    expected_deliverables: taskExpectedDeliverables,
    tech_stack: toDisplayLines(sourceTask.tech_stack),
    domain_tags: toDisplayLines(sourceTask.domain_tags),
  } as TaskDetail)
  const reviewMetadata = $derived({
    statuses: [{ value: taskStatusId, label: taskStatus }],
    labels: [{ value: taskLabel, label: taskLabel }],
    priorities: [{ value: taskPriority, label: taskPriority }],
    users: [
      ...(revieweeId ? [{ id: revieweeId, username: taskAssignee, email: '' }] : []),
      ...(taskCreatorId && taskCreatorId !== revieweeId
        ? [{ id: taskCreatorId, username: taskCreator, email: '' }]
        : []),
      ...detail.reviewers
        .filter((reviewer) => reviewer.reviewer_id !== revieweeId && reviewer.reviewer_id !== taskCreatorId)
        .map((reviewer) => ({ id: reviewer.reviewer_id, username: reviewer.reviewer_name ?? reviewer.reviewer_id, email: '' })),
    ],
  } as Pick<TaskMetadata, 'statuses' | 'labels' | 'priorities' | 'users'>)

  $effect(() => {
    // The admin dispute panel already receives the canonical task snapshot in
    // its runtime context. Calling the user-scoped task endpoint from the
    // system-admin workspace has no organization context and only produces a
    // misleading "Vui lòng chọn organization" error toast.
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
        // The review projection remains a safe fallback when the canonical
        // task endpoint is unavailable to this reviewer.
      })
  })

  $effect(() => {
    if (
      !currentUserId ||
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

  function openDispute(reviewMessageId: string) {
    if (!workflowId) return
    const responseMessageId = detail.reviewMessages.find(
      (message) =>
        message.message_type === 'reviewee_response' &&
        message.parent_review_message_id === reviewMessageId
    )?.id
    router.post(`/task-reviews/${workflowId}/open-dispute`, {
      review_message_id: reviewMessageId,
      response_message_id: responseMessageId ?? '',
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

  async function finalizeResolvedWorkflow() {
    if (!canFinalizeWorkflow || finalizingWorkflow) return
    actionError = ''
    finalizingWorkflow = true
    try {
      await axios.post(
        `/api/v1/me/organizations/current/reviews/tasks/${workflowId}/finalize`,
        {}
      )
      router.reload({ only: ['board', 'detail', 'flash'] })
    } catch (error: unknown) {
      const payload = axios.isAxiosError<ReviewActionErrors>(error) ? error.response?.data : null
      actionError = extractActionError(
        payload && typeof payload === 'object'
          ? (payload as ReviewActionErrors)
          : { message: t('task.review_workflow.action_failed', {}, 'Review action failed. Please try again.') }
      )
    } finally {
      finalizingWorkflow = false
    }
  }

  function formatDate(value: unknown): string {
    if (typeof value !== 'string' && !(value instanceof Date)) return '—'
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return '—'
    return dateTimeFormatter.format(parsed)
  }

  function formatHours(value: unknown): string {
    if (value === null || value === undefined || value === '') return '—'
    const hours = Number(value)
    return Number.isFinite(hours) ? `${hours}h` : '—'
  }

  function parseListValue(value: unknown): unknown {
    if (typeof value !== 'string') return value
    const trimmed = value.trim()
    if (!trimmed.startsWith('[') && !trimmed.startsWith('{')) return value
    try {
      return JSON.parse(trimmed)
    } catch {
      return value
    }
  }

  function toDisplayLines(value: unknown): string[] {
    const parsed = parseListValue(value)
    const items = Array.isArray(parsed) ? parsed : parsed ? [parsed] : []

    return items
      .map((item) => {
        if (typeof item === 'string' || typeof item === 'number') return String(item).trim()
        if (!item || typeof item !== 'object') return ''
        const record = item as Record<string, unknown>
        const candidate =
          record['title'] ??
          record['name'] ??
          record['description'] ??
          record['deliverable'] ??
          record['text'] ??
          record['value']
        return candidate === null || candidate === undefined ? '' : String(candidate).trim()
      })
      .filter(Boolean)
  }

  function getDeliveryTiming(dueValue: unknown, completedValue: unknown): {
    label: string
    isLate: boolean
  } {
    const dueAt = typeof dueValue === 'string' || dueValue instanceof Date ? new Date(dueValue) : null
    if (!dueAt || Number.isNaN(dueAt.getTime())) return { label: '', isLate: false }

    const completedAt =
      typeof completedValue === 'string' || completedValue instanceof Date
        ? new Date(completedValue)
        : null
    const hasCompletion = Boolean(completedAt && !Number.isNaN(completedAt.getTime()))
    const comparisonAt = hasCompletion ? completedAt!.getTime() : Date.now()
    const dayMs = 24 * 60 * 60 * 1000
    const dayDifference = Math.ceil((comparisonAt - dueAt.getTime()) / dayMs)

    if (hasCompletion) {
      if (dayDifference > 0) {
        return {
          label: t(
            'task.review_workflow.completed_late_days',
            { count: dayDifference },
            `Completed ${dayDifference} days late`
          ),
          isLate: true,
        }
      }
      if (dayDifference < 0) {
        const count = Math.abs(dayDifference)
        return {
          label: t(
            'task.review_workflow.completed_early_days',
            { count },
            `Completed ${count} days early`
          ),
          isLate: false,
        }
      }
      return {
        label: t('task.review_workflow.completed_on_time', {}, 'Completed on time'),
        isLate: false,
      }
    }

    if (dayDifference > 0) {
      return {
        label: t(
          'task.review_workflow.overdue_days',
          { count: dayDifference },
          `${dayDifference} days overdue`
        ),
        isLate: true,
      }
    }

    return { label: '', isLate: false }
  }
</script>

<div class="flex h-full min-h-0 flex-col bg-background" data-demo-section="task-review-workflow">
  {#if visibleReviewTab === 'context'}
    <TaskDetailFrame
      task={reviewTask}
      metadata={reviewMetadata}
      {currentUserId}
      workSurfacePermissions={{ canComment: Boolean(currentUserId), canOpenWorkTabs: true }}
      actionLabel={t('task.review_workflow.tab_title', {}, 'Reviews & disputes')}
      onAction={() => { activeReviewTab = 'review' }}
      lockedMessage={t('task.edit.locked_after_review', {}, 'Task đã hoàn thành hoặc vào review nên thông tin đánh giá đã được khóa.')}
    />
  {:else}
  <header class="shrink-0 border-b p-5">
    <div class="mb-2 flex items-center gap-2 text-xs text-muted-foreground"><span class="rounded bg-muted px-2 py-1 font-mono">{taskId.slice(0, 8)}</span><Sparkles class="h-3.5 w-3.5" /><span>{t('task.detail_panel.issue_label', {}, 'Issue')}</span></div>
    <div class="flex flex-wrap items-start justify-between gap-3"><h2 class="min-w-0 text-2xl font-bold leading-tight">{taskTitle}</h2><button type="button" class="shrink-0 rounded-md border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted" onclick={() => { activeReviewTab = 'context' }}>{t('task.review_workflow.task_context', {}, 'Task context')}</button></div>
    <p class="mt-4 text-xs text-muted-foreground">{t('task.edit.locked_after_review', {}, 'Task đã hoàn thành hoặc vào review nên thông tin đánh giá đã được khóa.')}</p>
  </header>
  <div class="min-h-0 flex-1 overflow-y-auto md:grid md:grid-cols-[minmax(0,1fr)_280px] md:overflow-hidden">
    <main class="min-w-0 p-5 md:overflow-y-auto" data-testid="review-task-context">
      {#if false}
      <div class="space-y-6">
        <section>
          <h3 class="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t('task.description', {}, 'Description')}
          </h3>
          {#if taskDescription}
            <div class="whitespace-pre-wrap rounded-lg border border-border bg-muted/20 p-4 text-sm leading-relaxed text-foreground">
              {taskDescription}
            </div>
          {:else}
            <div class="rounded-lg border border-dashed border-border p-4 text-sm italic text-muted-foreground">
              {t('task.no_description', {}, 'No description')}
            </div>
          {/if}
        </section>

        <TaskExecutionBrief task={detail.task as never} />

        {#if false && (taskContextBackground || taskAcceptanceCriteria || taskVerificationMethods.length > 0)}
          <section class="space-y-4 rounded-lg border border-border bg-muted/5 p-4">
            <h3 class="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <span class="font-bold text-primary">✦</span>
              {t('task.detail_panel.context_title', {}, 'Context and detailed acceptance')}
            </h3>

            {#if taskContextBackground}
              <div class="space-y-1">
                <h4 class="text-[11px] font-bold uppercase text-muted-foreground">
                  {t('task.detail_panel.business_context', {}, 'Business context')}
                </h4>
                <p class="whitespace-pre-wrap rounded-md border border-border/40 bg-muted/40 p-2.5 text-sm leading-6 text-foreground">{taskContextBackground}</p>
              </div>
            {/if}

            {#if taskAcceptanceCriteria}
              <div class="space-y-1">
                <h4 class="text-[11px] font-bold uppercase text-muted-foreground">
                  {t('task.detail_panel.acceptance_criteria', {}, 'Acceptance criteria')}
                </h4>
                <p class="whitespace-pre-wrap rounded-md border border-border/40 bg-muted/40 p-2.5 text-sm leading-6 text-foreground">{taskAcceptanceCriteria}</p>
              </div>
            {/if}

            {#if taskVerificationMethods.length > 0}
              <div class="space-y-1">
                <h4 class="text-[11px] font-bold uppercase text-muted-foreground">
                  {t('task.detail_panel.verification_method', {}, 'Verification method')}
                </h4>
                <ul class="list-disc space-y-1 rounded-md border border-border/40 bg-muted/40 py-2.5 pl-7 pr-3 text-sm text-foreground">
                  {#each taskVerificationMethods as method}
                    <li>{method}</li>
                  {/each}
                </ul>
              </div>
            {/if}

          </section>
        {/if}

        {#if false && taskExpectedDeliverables.length > 0}
          <section>
            <h3 class="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t('task.expected_deliverables', {}, 'Expected deliverables')}
            </h3>
            <ul class="list-disc space-y-1 rounded-lg border border-border bg-muted/20 py-3 pl-8 pr-4 text-sm leading-6 text-foreground">
              {#each taskExpectedDeliverables as deliverable}
                <li>{deliverable}</li>
              {/each}
            </ul>
          </section>
        {/if}

        {#if showOrganizationContext && (organizationName || projectName || projectDescription)}
          <section class="space-y-3 rounded-lg border border-border bg-muted/5 p-4">
            <h3 class="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {t('task.detail_panel.execution_scope', {}, 'Organization and project context')}
            </h3>
            <dl class="grid gap-3 text-sm sm:grid-cols-2">
              {#if organizationName}
                <div>
                  <dt class="text-xs font-medium text-muted-foreground">{t('task.detail_panel.organization', {}, 'Organization')}</dt>
                  <dd class="mt-0.5 font-medium text-foreground">{organizationName}</dd>
                  {#if organizationDescription}<dd class="mt-1 text-xs leading-5 text-muted-foreground">{organizationDescription}</dd>{/if}
                </div>
              {/if}
              {#if projectName}
                <div>
                  <dt class="text-xs font-medium text-muted-foreground">{t('task.detail_panel.project', {}, 'Project')}</dt>
                  <dd class="mt-0.5 font-medium text-foreground">{projectName}</dd>
                  {#if projectStatus}<dd class="mt-1 text-xs text-muted-foreground">{projectStatus}</dd>{/if}
                </div>
              {/if}
              {#if projectDescription}
                <div class="sm:col-span-2">
                  <dt class="text-xs font-medium text-muted-foreground">{t('task.detail_panel.project_context', {}, 'Project context')}</dt>
                  <dd class="mt-0.5 whitespace-pre-wrap leading-6 text-foreground">{projectDescription}</dd>
                </div>
              {/if}
            </dl>
          </section>
        {/if}

        <section class="border-t border-border pt-5" data-testid="task-discussion-content">
          <h3 class="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
            <MessageSquareText class="size-4 text-muted-foreground" />
            {t('task.discussion_tab.title', {}, 'Task discussion')}
          </h3>
          <TaskDiscussionTab
            {taskId}
            {currentUserId}
            initialComments={taskComments}
            readOnly={!currentUserId}
          />
        </section>
      </div>

      {:else}

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
            <section class="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
              <h4 class="text-sm font-bold text-foreground">
                {t('task.review_workflow.finalization.title', {}, 'Final review completion')}
              </h4>
              <p class="mt-1 text-sm leading-6 text-muted-foreground">
                {t('task.review_workflow.finalization.pending_help', {}, 'This review is resolved, but it is not Done yet. A final completion is the only review-board state that can queue governed profile projection.')}
              </p>
              {#if canFinalizeWorkflow}
                <button type="button" class="mt-3 inline-flex min-h-9 items-center rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground disabled:opacity-60" onclick={finalizeResolvedWorkflow} disabled={finalizingWorkflow}>
                  {finalizingWorkflow
                    ? t('task.review_workflow.finalization.finalizing', {}, 'Finalizing review...')
                    : t('task.review_workflow.finalization.finalize', {}, 'Mark review Done')}
                </button>
              {:else}
                <p class="mt-3 text-xs font-medium text-muted-foreground">
                  {t('task.review_workflow.finalization.governor_required', {}, 'An organization owner or administrator must mark the review Done.')}
                </p>
              {/if}
            </section>
          {/if}

          <section class="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border pb-3">
            <h4 class="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
              {t('task.review_workflow.reviewers', {}, 'Reviewers')}
            </h4>
            <div class="flex flex-wrap gap-2">
              {#each detail.reviewers as reviewer (reviewer.reviewer_id)}
                <div class="inline-flex min-w-0 items-center gap-1.5 rounded-full border border-border bg-muted/20 px-2.5 py-1 text-xs">
                  <span class="max-w-40 truncate font-semibold">{reviewer.reviewer_name ?? reviewer.reviewer_id}</span>
                  <span class="text-muted-foreground">· {reviewerRoleLabel(reviewer.reviewer_role)} · {reviewerStatusLabel(reviewer.status)}</span>
                </div>
              {:else}
                <div class="rounded-md border border-dashed border-border px-3 py-3 text-sm text-muted-foreground">
                  {t('task.review_workflow.first_review_hint', {}, 'The first review creates the workflow and reviewer quorum.')}
                </div>
              {/each}
            </div>
            {#if missingReviewCount > 0}
              <p class="w-full text-sm text-muted-foreground">
                {t('task.review_workflow.community_review_needed', { count: missingReviewCount }, `Need ${missingReviewCount} more project review${missingReviewCount === 1 ? '' : 's'}.`)}
              </p>
            {/if}
          </section>

          {#if canCreateReview && !editingReview}
            <section class="space-y-2 border-t border-border pt-4">
              <label class="text-sm font-bold" for="task-review-body">
                {t('task.review_workflow.review_label', {}, 'Enter review')}
              </label>
              <textarea id="task-review-body" bind:value={reviewBody} class="min-h-28 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"></textarea>
              <div class="flex flex-wrap gap-2">
                <button type="button" class="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground" onclick={submitReview}>
                  <Send class="h-4 w-4" />
                  {editingReview
                    ? t('task.review_workflow.update_review', {}, 'Update review')
                    : t('task.review_workflow.send_review', {}, 'Send review')}
                </button>
                {#if editingReview}
                  <button type="button" class="min-h-10 rounded-md border border-border bg-background px-4 py-2 text-sm font-bold" onclick={cancelEditReview}>
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
                    <span class="font-semibold text-foreground">
                      {message.message_type === 'system'
                        ? reviewMessageAuthorLabel(message)
                        : `${reviewMessageAuthorLabel(message)} · ${reviewMessageTypeLabel(message.message_type)}`}
                    </span>
                    <span class="shrink-0">
                      {#if (message.revision_count ?? 0) > 1}
                        {t('task.review_workflow.edited_at', {}, 'Edited')} {formatDate(message.updated_at)}
                      {:else}
                        {formatDate(message.created_at)}
                      {/if}
                    </span>
                  </header>
                  <p class="mt-2 max-w-[75ch] whitespace-pre-wrap text-sm leading-6 text-foreground">{reviewMessageBodyLabel(message)}</p>
                  {#if message.reviewee_decision && !(message.requires_reviewer_confirmation && message.reviewee_decision === 'accepted')}
                    <span class="mt-2 inline-flex rounded-full border px-2 py-0.5 text-xs font-bold {message.reviewee_decision === 'accepted' ? 'border-primary/30 bg-primary/10 text-primary' : 'border-destructive/30 bg-destructive/10 text-destructive'}">
                      {message.reviewee_decision === 'accepted'
                        ? t('task.review_workflow.review_accepted', {}, 'Accepted by reviewee')
                        : t('task.review_workflow.review_rejected', {}, 'Disputed by reviewee')}
                    </span>
                  {/if}
                  {#if message.reviewer_agreed_at}
                    <span class="mt-2 inline-flex rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                      {t('task.review_workflow.review_settlement_confirmed', {}, 'Both parties agreed')}
                    </span>
                  {:else if message.requires_reviewer_confirmation && message.reviewee_decision === 'accepted'}
                    <span class="mt-2 inline-flex rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                      {t('task.review_workflow.reviewee_settlement_confirmed', {}, 'Reviewee agreed — waiting for reviewer confirmation')}
                    </span>
                  {/if}
                  {#if message.message_type === 'review' && (message.revision_count ?? 0) > 1}
                    <details class="mt-3 rounded-md border border-border bg-muted/10 px-3 py-2">
                      <summary class="cursor-pointer text-xs font-bold text-foreground">
                        {t('task.review_workflow.view_edit_history', {}, 'View edit history')}
                      </summary>
                      <ol class="mt-3 space-y-3 border-t border-border pt-3">
                        {#each message.revisions ?? [] as revision (revision.id)}
                          <li class="text-sm">
                            <div class="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                              <span class="font-bold text-foreground">
                                {t(
                                  'task.review_workflow.revision_number',
                                  { number: revision.revision_number },
                                  `Version ${revision.revision_number}`
                                )}
                              </span>
                              <span>{revision.editor_name ?? revision.editor_id} · {formatDate(revision.created_at)}</span>
                            </div>
                            <p class="mt-1 whitespace-pre-wrap leading-6 text-foreground">{revision.body}</p>
                          </li>
                        {/each}
                      </ol>
                    </details>
                  {/if}
                  {#if message.message_type === 'review' && message.author_id === currentUserId && canEditSubmittedReview}
                    <div class="mt-3 flex flex-wrap items-center gap-2">
                      <button type="button" class="inline-flex min-h-8 items-center rounded-md px-2.5 py-1 text-xs font-semibold text-primary transition hover:bg-primary/10" onclick={beginEditReview}>
                        {t('task.review_workflow.edit_review', {}, 'Edit review')}
                      </button>
                      <button type="button" class="inline-flex min-h-8 items-center rounded-md px-2.5 py-1 text-xs font-semibold text-destructive transition hover:bg-destructive/10" onclick={() => withdrawMessage(message)}>
                        {t('task.review_workflow.delete_message', {}, 'Delete')}
                      </button>
                    </div>
                  {/if}
                  {#if editingReview && message.id === mySubmittedReview?.id}
                    <div class="mt-4 space-y-2 border-t border-border pt-3">
                      <label class="text-xs font-bold" for={`task-review-edit-${message.id}`}>{t('task.review_workflow.edit_review', {}, 'Edit review')}</label>
                      <textarea id={`task-review-edit-${message.id}`} bind:value={reviewBody} class="min-h-28 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"></textarea>
                      <div class="flex flex-wrap gap-2">
                        <button type="button" class="inline-flex min-h-9 items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground" onclick={submitReview}><Send class="h-3.5 w-3.5" />{t('task.review_workflow.update_review', {}, 'Update review')}</button>
                        <button type="button" class="min-h-9 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-bold" onclick={cancelEditReview}>{t('common.cancel', {}, 'Cancel')}</button>
                      </div>
                    </div>
                  {/if}
                  {#each detail.reviewMessages.filter((candidate) => candidate.parent_review_message_id === message.id) as reply (reply.id)}
                    <div class="mt-4 border-t border-border pt-3 text-sm">
                      <div class="flex flex-wrap items-start justify-between gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span class="font-semibold text-foreground">
                          {reply.message_type === 'system'
                            ? reviewMessageAuthorLabel(reply)
                            : `${reviewMessageAuthorLabel(reply)} · ${reviewMessageTypeLabel(reply.message_type)}`}
                        </span>
                        <span>{formatDate(reply.created_at)}</span>
                      </div>
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
                        <button type="button" class="min-h-9 rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground" onclick={() => respondReview(message.id)}>{isDisputeDiscussion(message) ? t('task.review_workflow.send_dispute_discussion', {}, 'Send discussion reply') : t('task.review_workflow.send_response', {}, 'Send response')}</button>
                      </div>
                    {:else}
                      <button type="button" class="mt-4 inline-flex min-h-9 items-center rounded-md border border-destructive/30 bg-destructive/5 px-3 py-1.5 text-xs font-bold text-destructive hover:bg-destructive/10" onclick={() => { activeResponseReviewId = message.id; activeReportReviewId = null; responseBody = '' }}>{isDisputeDiscussion(message) ? t('task.review_workflow.continue_dispute_discussion', {}, 'Continue dispute discussion') : t('task.review_workflow.respond_to_review', {}, 'Respond to this review')}</button>
                    {/if}
                  {/if}
                  {#if canOpenDispute(message) || canDecide(message) || canReviewerConfirm(message) || (canReportFor(message) && activeReportReviewId !== message.id)}
                    <div class="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-3">
                      {#if canOpenDispute(message)}
                        <button type="button" class="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-1.5 text-xs font-bold text-destructive hover:bg-destructive/10" onclick={() => openDispute(message.id)}>
                          <AlertTriangle class="h-3.5 w-3.5" />
                          {t('task.review_workflow.open_dispute', {}, 'Mở tranh luận')}
                        </button>
                      {/if}
                      {#if canDecide(message)}
                      <button type="button" class="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground" onclick={() => decideReview(message.id, 'accepted')}>
                        <CheckCircle2 class="h-3.5 w-3.5" />
                        {message.reviewee_decision === 'rejected'
                          ? t('task.review_workflow.accept_after_discussion', {}, 'Accept after discussion')
                          : t('task.review_workflow.accept_this_review', {}, 'Accept this review')}
                      </button>
                      {/if}
                      {#if canReviewerConfirm(message)}
                        <button type="button" class="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground" onclick={() => decideReview(message.id, 'accepted')}>
                          <CheckCircle2 class="h-3.5 w-3.5" />
                          {message.reviewee_decision === 'accepted'
                            ? t('task.review_workflow.confirm_dispute_resolution', {}, 'Confirm resolution')
                            : t('task.review_workflow.agree_this_review', {}, 'Agree to this review')}
                        </button>
                      {/if}
                      {#if canReportFor(message) && activeReportReviewId !== message.id}
                        <button type="button" class="inline-flex min-h-9 items-center justify-center rounded-md border border-destructive/30 px-3 py-1.5 text-xs font-bold text-destructive" onclick={() => { activeReportReviewId = message.id; activeResponseReviewId = null; disputeType = 'review_fairness'; disputeClaim = ''; disputeEvidence = ''; requestedOutcome = 'reviewer_re_review' }}>{t('task.review_workflow.report_this_review', {}, 'Report this review')}</button>
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
                        <button type="button" class="min-h-9 rounded-md bg-destructive px-3 py-1.5 text-xs font-bold text-destructive-foreground" onclick={() => reportDispute(message.id)}>{t('task.review_workflow.send_report', {}, 'Send report')}</button>
                      </div>
                    {/if}
                  {/if}
                </article>
              {:else}
                <div class="rounded-md border border-dashed border-border px-3 py-3 text-sm text-muted-foreground">
                  {t('task.review_workflow.no_discussion', {}, 'No review discussion yet.')}
                </div>
              {/each}
            </div>
          </section>
        </div>
      </section>
      {/if}
    </main>

    <aside class="border-t border-border bg-muted/10 p-4 md:overflow-y-auto md:border-l md:border-t-0" data-testid="review-task-metadata-sidebar">
      <div class="space-y-5">
        <section>
          <h3 class="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t('task.status', {}, 'Status')}
          </h3>
          <span class="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
            <CheckCircle2 class="h-3.5 w-3.5" />
            {taskStatus}
          </span>
        </section>

        <div class="border-t border-border"></div>

        <div class="space-y-4 text-sm">
          <div class="flex items-center justify-between gap-3">
            <span class="text-muted-foreground">{t('task.priority', {}, 'Priority')}</span>
            <span class="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-xs font-bold">
              <CircleAlert class="h-3.5 w-3.5" />
              {taskPriority}
            </span>
          </div>

          <div class="flex items-center justify-between gap-3">
            <span class="text-muted-foreground">{t('task.label', {}, 'Label')}</span>
            <span class="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-xs font-bold">
              <Tag class="h-3.5 w-3.5" />
              {taskLabel}
            </span>
          </div>

          <div class="flex items-center justify-between gap-3">
            <span class="text-muted-foreground">{t('task.difficulty', {}, 'Difficulty')}</span>
            <span class="text-xs font-bold text-foreground">{taskDifficulty}</span>
          </div>

          <div class="flex items-center justify-between gap-3">
            <span class="text-muted-foreground">{t('task.assignee', {}, 'Assignee')}</span>
            <span class="inline-flex max-w-40 items-center gap-1.5 rounded-md bg-muted px-2 py-1 text-right text-xs font-medium">
              <UserRound class="h-3.5 w-3.5 shrink-0" />
              <span class="truncate">{taskAssignee}</span>
            </span>
          </div>

          <div class="flex items-start justify-between gap-3">
            <span class="text-muted-foreground">{t('task.due_date', {}, 'Due date')}</span>
            <div class="text-right">
              <span class={`inline-flex items-center gap-1.5 text-xs font-medium ${deliveryTiming.isLate ? 'text-destructive' : 'text-foreground'}`}>
                <CalendarDays class="h-3.5 w-3.5" />
                {taskDueDate}
              </span>
              {#if deliveryTiming.label}
                <p class={`mt-1 text-[11px] font-semibold ${deliveryTiming.isLate ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {deliveryTiming.label}
                </p>
              {/if}
            </div>
          </div>

          <div class="flex items-start justify-between gap-3">
            <span class="text-muted-foreground">{t('task.review_workflow.completed_at', {}, 'Completed at')}</span>
            <span class="inline-flex items-center gap-1.5 text-right text-xs">
              <History class="h-3.5 w-3.5 shrink-0" />
              {assignmentCompletedAt}
            </span>
          </div>

          <div class="flex items-center justify-between gap-3">
            <span class="text-muted-foreground">{t('task.estimated_time', {}, 'Estimated time')}</span>
            <span class="inline-flex items-center gap-1 text-xs"><Clock3 class="h-3.5 w-3.5" />{taskEstimatedTime}</span>
          </div>

          <div class="flex items-center justify-between gap-3">
            <span class="text-muted-foreground">{t('task.actual_time', {}, 'Actual time')}</span>
            <span class="inline-flex items-center gap-1 text-xs"><Clock3 class="h-3.5 w-3.5" />{taskActualTime}</span>
          </div>

          <div class="flex items-center justify-between gap-3">
            <span class="text-muted-foreground">{t('task.visibility.label', {}, 'Visibility')}</span>
            <span class="inline-flex items-center gap-1.5 rounded-md bg-muted px-2 py-1 text-right text-xs font-bold">
              <Eye class="h-3.5 w-3.5" />
              {taskVisibility}
            </span>
          </div>

          <div class="flex items-start justify-between gap-3">
            <span class="text-muted-foreground">{t('task.created_at', {}, 'Created at')}</span>
            <span class="text-right text-xs">{taskCreatedAt}</span>
          </div>

          <div class="flex items-start justify-between gap-3">
            <span class="text-muted-foreground">{t('task.updated_at', {}, 'Updated at')}</span>
            <span class="text-right text-xs">{taskUpdatedAt}</span>
          </div>

          <div class="flex items-start justify-between gap-3">
            <span class="text-muted-foreground">{t('task.review_workflow.task_created_by', {}, 'Created by')}</span>
            <span class="text-right text-xs font-medium">{taskCreator}</span>
          </div>
        </div>
      </div>
    </aside>
  </div>
  {/if}
</div>
