<script lang="ts">
  import { router } from '@inertiajs/svelte'
  import axios, { AxiosError } from 'axios'

  import Tabs from '@/apps/admin/shared/ui/tabs.svelte'
  import TabsContent from '@/apps/admin/shared/ui/tabs_content.svelte'
  import TabsList from '@/apps/admin/shared/ui/tabs_list.svelte'
  import TabsTrigger from '@/apps/admin/shared/ui/tabs_trigger.svelte'
  import { useTranslation } from '@/apps/admin/shared/stores/translation.svelte'

  import DisputeOverviewTab from './components/dispute_overview_tab.svelte'
  import DisputeTimelineTab from './components/dispute_timeline_tab.svelte'
  import DisputeDiscussionTab from './components/dispute_discussion_tab.svelte'
  import DisputeEvidenceTab from './components/dispute_evidence_tab.svelte'
  import DisputeResolveTab from './components/dispute_resolve_tab.svelte'
  import TaskReviewWorkflowPanel from '@/apps/user/modules/tasks/components/detail/task_review_workflow_panel.svelte'
  import {
    getDisputeRuntimeContext,
    getDisputeSourceType,
  } from './types/dispute_resolve_types'
  import type { DisputeSourceType, RuntimeContext } from './types/dispute_resolve_types'

	  interface Dispute {
	    id: string
	    review_session_id: string | null
	    task_id: string | null
    task_title: string | null
    task_description: string | null
    organization_id: string | null
    project_id: string | null
    reviewee_id: string
    reviewee_username: string | null
    reviewee_email: string | null
    status: string
    dispute_reason: string
    requested_outcome: string
    created_at: string
    disputed_dimensions: Record<string, unknown>
    disputed_skill_reviews: Record<string, unknown>[]
    final_decision: string | null
    final_rationale: string | null
    review_session_status: string | null
    review_overall_score?: number | null
    review_strengths?: string | null
    review_improvements?: string | null
    source_type?: DisputeSourceType | string | null
    sourceType?: DisputeSourceType | string | null
    dispute_review_type?: string | null
    disputeReviewType?: string | null
    runtime_context?: RuntimeContext | null
    runtimeContext?: RuntimeContext | null
    organization_name?: string | null
    organizationName?: string | null
    project_name?: string | null
    projectName?: string | null
    sprint_id?: string | null
    sprintId?: string | null
    sprint_name?: string | null
    sprintName?: string | null
    task_review_detail?: Record<string, unknown> | null
  }

  interface Comment {
    id: string
    author_id: string
    body: string
    created_at: string
    author_context: string | null
    author_system_role: string | null
  }

  interface Evidence {
    id: string
    evidenceType: string
    url: string
    title: string | null
    description: string | null
    uploaded_by: string
    created_at: string
  }

  interface CaseFile {
    id: string
    case_version: number
    completeness_score: number
    missing_data: string[]
    created_at: string
    task_comments_snapshot?: Array<{
      body?: string | null
      author_id?: string | null
      comment_type?: string | null
      review_relevance?: boolean | null
      created_at?: string | null
    }>
    evidences_snapshot?: Array<{
      title?: string | null
      evidence_type?: string | null
    }>
    dispute_claim_snapshot?: {
      dispute_reason?: string | null
      requested_outcome?: string | null
      dispute_comments?: Array<{
        body?: string | null
        author_context?: string | null
      }>
    }
  }

  interface AiEvaluation {
    id: string
    provider: string
    status: string
    recommendation: string | null
    confidence_score: number | null
    summary: string | null
    error_message?: string | null
    completed_at: string | null
    profileApprovals?: Array<{
      id: string
      proposalIndex: number
      approvedObservedLevel: string
      approvedAt: string
    }>
  }

  interface TimelineEntry {
    id: string
    kind: 'audit' | 'comment' | 'evidence' | 'case_file' | 'ai_evaluation'
    action: string
    occurred_at: string
    actor_id: string | null
    actor_label: string | null
    summary: string
    metadata?: Record<string, unknown>
  }

  interface Props {
    dispute: Dispute
    comments: Comment[]
    evidences: Evidence[]
    case_files: CaseFile[]
    ai_evaluations: AiEvaluation[]
    timeline: TimelineEntry[]
  }

  const { dispute, comments, evidences, case_files, ai_evaluations, timeline }: Props = $props()
  const { t } = useTranslation()
  type AdminDisputeTab = 'overview' | 'timeline' | 'discussion' | 'evidence' | 'ai_conclusion'

  let activeTab = $state<AdminDisputeTab>('overview')
  let commentBody = $state('')
  let postingComment = $state(false)

  let finalDecision = $state<'uphold_review' | 'adjust_score' | 'request_re_review' | 'dismiss_dispute' | 'partially_accept'>('dismiss_dispute')
  let finalRationale = $state('')
  let resolving = $state(false)
  let approvingProfileProposal = $state(false)

  let errorMsg = $state('')
  let successMsg = $state('')
  const openDispute = $derived(dispute.status !== 'resolved' && dispute.status !== 'rejected')
  const latestCaseFile = $derived(case_files[0] ?? null)
  const sourceType = $derived(getDisputeSourceType(dispute))
  const runtimeContext = $derived(getDisputeRuntimeContext(dispute))
  const taskReviewDetail = $derived(
    sourceType === 'task_review_workflow' ? (dispute.task_review_detail ?? null) : null
  )
  const sourceLabel = $derived(
    t(
      `task.disputes.index.source.${sourceType}`,
      {},
      sourceType === 'sprint_review_dispute'
        ? 'Sprint review'
        : sourceType === 'sprint_reverse_review_workflow'
          ? 'Reverse review'
          : 'Task review'
    )
  )
  const runtimeScope = $derived.by(() => {
    const organizationName =
      dispute.organizationName ??
      dispute.organization_name ??
      runtimeContext.organization?.name ??
      dispute.organization_id
    const projectName =
      dispute.projectName ?? dispute.project_name ?? runtimeContext.project?.name ?? dispute.project_id
    const sprintName =
      dispute.sprintName ??
      dispute.sprint_name ??
      runtimeContext.sprint?.name ??
      dispute.sprintId ??
      dispute.sprint_id

    return [organizationName, projectName, sprintName].filter(Boolean).join(' / ')
  })
  const latestCaseFileStats = $derived.by(() => ({
    taskComments: latestCaseFile?.task_comments_snapshot?.length ?? 0,
    disputeMessages: latestCaseFile?.dispute_claim_snapshot?.dispute_comments?.length ?? 0,
    evidences: latestCaseFile?.evidences_snapshot?.length ?? 0,
  }))
  const pageTitle = $derived(t('task.disputes.admin_detail.page_title', {}, 'Admin - Dispute detail'))

  function isErrorMessageRecord(value: unknown): value is { message: string } {
    return (
      typeof value === 'object' &&
      value !== null &&
      'message' in value &&
      typeof value.message === 'string'
    )
  }

  function hasErrorList(value: unknown): value is { errors: unknown[] } {
    return (
      typeof value === 'object' &&
      value !== null &&
      'errors' in value &&
      Array.isArray(value.errors)
    )
  }

  function extractApiErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof AxiosError) {
      const responseData: unknown = error.response?.data
      if (hasErrorList(responseData)) {
        const firstError = responseData.errors[0]
        if (isErrorMessageRecord(firstError)) {
          return firstError.message
        }
      }
    }

    return fallback
  }

  async function postComment() {
    if (!commentBody.trim() || postingComment) return
    postingComment = true
    errorMsg = ''
    successMsg = ''
    try {
      await axios.post(`/api/admin/reviews/disputes/${dispute.id}/comments`, {
        body: commentBody.trim(),
        visibility: 'all_parties',
      })
      commentBody = ''
      router.reload({ only: ['comments'] })
      successMsg = t('task.disputes.admin_detail.comment_success', {}, 'Comment posted successfully.')
    } catch (error: unknown) {
      errorMsg = extractApiErrorMessage(error, t('task.disputes.admin_detail.comment_error', {}, 'Unable to post comment.'))
    } finally {
      postingComment = false
    }
  }

  async function resolveDispute(
    resolution: {
      finalDecision: typeof finalDecision
      finalRationale: string
    } = { finalDecision, finalRationale }
  ) {
    if (!resolution.finalRationale.trim() || resolving) return
    resolving = true
    errorMsg = ''
    successMsg = ''
    try {
      await axios.post(`/api/admin/reviews/disputes/${dispute.id}/resolve`, {
        finalDecision: resolution.finalDecision,
        finalRationale: resolution.finalRationale.trim(),
        sourceType,
      })
      router.reload({ only: ['dispute', 'comments', 'evidences', 'case_files', 'ai_evaluations', 'timeline', 'flash'] })
      successMsg = t('task.disputes.admin_detail.resolve_success', {}, 'Dispute resolved successfully.')
    } catch (error: unknown) {
      errorMsg = extractApiErrorMessage(error, t('task.disputes.admin_detail.resolve_error', {}, 'Unable to resolve dispute.'))
    } finally {
      resolving = false
    }
  }

  function isResolutionDecision(value: string | null): value is typeof finalDecision {
    return ['uphold_review', 'adjust_score', 'request_re_review', 'dismiss_dispute', 'partially_accept'].includes(value ?? '')
  }

  async function acceptAiRecommendation() {
    const aiConclusion = ai_evaluations.find(
      (evaluation) => evaluation.status === 'completed' && isResolutionDecision(evaluation.recommendation)
    )
    const aiDecision = aiConclusion?.recommendation ?? null
    const aiSummary = aiConclusion?.summary ?? ''
    if (!isResolutionDecision(aiDecision)) {
      errorMsg = t('task.disputes.admin_detail.ai_conclusion_unavailable', {}, 'A completed AI conclusion is required before it can be accepted.')
      return
    }

    await resolveDispute({
      finalDecision: aiDecision,
      finalRationale: `Quản trị viên dùng kết luận AI để chốt tranh chấp. ${aiSummary}`.trim(),
    })
  }

  async function approveAiProfileProposal(evaluationId: string, proposalIndex: number) {
    if (approvingProfileProposal) return
    approvingProfileProposal = true
    errorMsg = ''
    successMsg = ''
    try {
      await axios.post(
        `/api/admin/reviews/disputes/${dispute.id}/ai-evaluations/${evaluationId}/profile-proposals/${proposalIndex}/approve`
      )
      router.reload({ only: ['dispute', 'ai_evaluations', 'timeline', 'flash'] })
      successMsg = 'Đã ghi nhận phê duyệt đề xuất năng lực. Dữ liệu chỉ được dùng cho hồ sơ khi workflow review đã hoàn tất.'
    } catch (error: unknown) {
      errorMsg = extractApiErrorMessage(error, 'Không thể phê duyệt đề xuất năng lực của AI.')
    } finally {
      approvingProfileProposal = false
    }
  }
</script>

<svelte:head>
  <title>{pageTitle}</title>
</svelte:head>

<div class="space-y-6">
  <Tabs value={activeTab} onValueChange={(value) => { activeTab = value as AdminDisputeTab }}>
    <TabsList class="flex h-auto flex-wrap justify-start gap-2 rounded-2xl border border-border bg-background p-2">
      {#if taskReviewDetail}
        <TabsTrigger value="overview">Hồ sơ tranh chấp</TabsTrigger>
      {:else}
        <TabsTrigger value="overview">{t('task.disputes.admin_detail.tabs.overview', {}, 'Overview')}</TabsTrigger>
        <TabsTrigger value="timeline">{t('task.disputes.admin_detail.tabs.timeline', {}, 'Timeline')}</TabsTrigger>
        <TabsTrigger value="discussion">{t('task.disputes.admin_detail.tabs.discussion', {}, 'Discussion')}</TabsTrigger>
        <TabsTrigger value="evidence">{t('task.disputes.admin_detail.tabs.evidence', {}, 'Evidence')}</TabsTrigger>
      {/if}
      <TabsTrigger value="ai_conclusion">Kết luận AI</TabsTrigger>
    </TabsList>

    {#if taskReviewDetail}
      <TabsContent value="overview" class="mt-4">
        <div class="h-[calc(100vh-13rem)] min-h-[42rem] overflow-hidden rounded-2xl border border-border bg-background shadow-xs">
          <TaskReviewWorkflowPanel
            taskId={dispute.task_id ?? ''}
            projectId={dispute.project_id}
            currentUserId={null}
            taskDetailUrl={`/admin/disputes/${dispute.id}`}
            detail={taskReviewDetail as never}
            translate={t}
            showOrganizationContext
            initialTab="context"
          />
        </div>
      </TabsContent>
    {:else}
  <section class="border-b border-border pb-5">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div class="min-w-0 space-y-3">
        <h1 class="text-3xl font-black tracking-tight text-foreground">
          {dispute.task_title ?? t('task.disputes.admin_detail.title', {}, 'Review dispute resolution')}
        </h1>
        <div class="flex flex-wrap items-center gap-2">
          <span class="rounded-full border border-border bg-muted px-3 py-1 text-xs font-semibold text-foreground">
            {openDispute ? t('task.disputes.admin_detail.processing', {}, 'In progress') : t('task.disputes.admin_detail.concluded', {}, 'Concluded')}
          </span>
          <span class="rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold text-muted-foreground">
            {sourceLabel}
          </span>
        </div>
        {#if dispute.task_description}
          <p class="max-w-3xl whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{dispute.task_description}</p>
        {/if}
      </div>
    </div>
  </section>

  {#if successMsg}
    <div class="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm font-medium text-emerald-600 font-sans">
      {successMsg}
    </div>
  {/if}

  {#if errorMsg}
    <div class="rounded-2xl border border-destructive/20 bg-destructive/10 p-3 text-sm font-medium text-destructive font-sans">
      {errorMsg}
    </div>
  {/if}

  <div class="mt-4 grid gap-6 lg:grid-cols-3">
    <div class="min-w-0 space-y-4 lg:col-span-2">
        <TabsContent value="overview" class="mt-0">
      <DisputeOverviewTab
        {dispute}
        latestCaseFile={latestCaseFile}
        caseFileStats={latestCaseFileStats}
      />
        </TabsContent>

        <TabsContent value="timeline" class="mt-4">
      <DisputeTimelineTab {timeline} />
        </TabsContent>

        <TabsContent value="discussion" class="mt-4">
      <DisputeDiscussionTab
        {comments}
        disputeStatus={dispute.status}
        bind:commentBody
        postingComment={postingComment}
        onPostComment={postComment}
      />
        </TabsContent>

        <TabsContent value="evidence" class="mt-4">
      <DisputeEvidenceTab
        {evidences}
        latestCaseFile={latestCaseFile}
      />
        </TabsContent>
    </div>

    <aside class="h-fit rounded-2xl border border-border bg-card p-4">
      <h2 class="text-sm font-black text-foreground">{t('task.disputes.admin_detail.dispute_summary', {}, 'Dispute')}</h2>
      <dl class="mt-4 space-y-4 text-sm">
        <div>
          <dt class="text-muted-foreground">{t('task.disputes.admin_detail.reviewee', {}, 'Reviewee')}</dt>
          <dd class="mt-1 font-semibold text-foreground">{dispute.reviewee_username ?? dispute.reviewee_email ?? dispute.reviewee_id.slice(0, 8)}</dd>
        </div>
        <div>
          <dt class="text-muted-foreground">{t('task.disputes.admin_detail.requested_outcome', {}, 'Requested outcome')}</dt>
          <dd class="mt-1 font-mono text-xs font-semibold text-foreground">{dispute.requested_outcome}</dd>
        </div>
        <div>
          <dt class="text-muted-foreground">{t('task.disputes.admin_detail.dispute_reason', {}, 'Dispute reason')}</dt>
          <dd class="mt-1 whitespace-pre-wrap leading-6 text-foreground">{dispute.dispute_reason}</dd>
        </div>
        {#if runtimeScope}
          <div>
            <dt class="text-muted-foreground">{t('task.disputes.admin_detail.scope', {}, 'Scope')}</dt>
            <dd class="mt-1 leading-6 text-foreground">{runtimeScope}</dd>
          </div>
        {/if}
      </dl>
    </aside>
  </div>
  {/if}

    <TabsContent value="ai_conclusion" class="mt-4">
      <DisputeResolveTab
        {dispute}
        aiEvaluations={ai_evaluations}
        {resolving}
        {approvingProfileProposal}
        bind:finalDecision
        bind:finalRationale
        onAcceptAi={acceptAiRecommendation}
        onApproveProfileProposal={approveAiProfileProposal}
        onResolve={() => resolveDispute()}
      />
    </TabsContent>
  </Tabs>
</div>
