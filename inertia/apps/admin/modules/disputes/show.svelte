<script lang="ts">
  import { router } from '@inertiajs/svelte'
  import axios, { AxiosError } from 'axios'

  import Tabs from '@/apps/admin/shared/ui/tabs.svelte'
  import TabsContent from '@/apps/admin/shared/ui/tabs_content.svelte'
  import TabsList from '@/apps/admin/shared/ui/tabs_list.svelte'
  import TabsTrigger from '@/apps/admin/shared/ui/tabs_trigger.svelte'
  import { currentDocumentLocale } from '@/apps/admin/shared/lib/date_locale'
  import { useTranslation } from '@/apps/admin/shared/stores/translation.svelte'

  import DisputeOverviewTab from './components/dispute_overview_tab.svelte'
  import DisputeTimelineTab from './components/dispute_timeline_tab.svelte'
  import DisputeDiscussionTab from './components/dispute_discussion_tab.svelte'
  import DisputeEvidenceTab from './components/dispute_evidence_tab.svelte'
  import DisputeResolveTab from './components/dispute_resolve_tab.svelte'
  import {
    getDisputeRuntimeContext,
    getDisputeReviewType,
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
    completed_at: string | null
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
  type AdminDisputeTab = 'overview' | 'timeline' | 'discussion' | 'evidence' | 'resolve'

  let activeTab = $state<AdminDisputeTab>('overview')
  let commentBody = $state('')
  let postingComment = $state(false)

  let buildingCaseFile = $state(false)
  let startingAi = $state(false)

  let finalDecision = $state<'uphold_review' | 'adjust_score' | 'request_re_review' | 'dismiss_dispute' | 'partially_accept'>('dismiss_dispute')
  let profileUpdateAction = $state<'recalculate_after_adjustment' | 'no_action'>('no_action')
  let reviewerCredibilityAction = $state<'mark_disputed_review' | 'no_action'>('no_action')
  let finalRationale = $state('')
  let overrideReadiness = $state(false)
  let overrideReason = $state('')
  let resolving = $state(false)

  let errorMsg = $state('')
  let successMsg = $state('')
  const documentLocale = $derived(currentDocumentLocale() === 'vi' ? 'vi-VN' : 'en-US')
  const openDispute = $derived(dispute.status !== 'resolved' && dispute.status !== 'rejected')
  const latestCaseFile = $derived(case_files[0] ?? null)
  const latestAiEvaluation = $derived(ai_evaluations[0] ?? null)
  const sourceType = $derived(getDisputeSourceType(dispute))
  const isClassicReviewDispute = $derived(sourceType === 'review_dispute')
  const disputeReviewType = $derived(getDisputeReviewType(dispute))
  const runtimeContext = $derived(getDisputeRuntimeContext(dispute))
  const hasRuntimeContext = $derived(Object.keys(runtimeContext).length > 0)
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
  const overviewStats = $derived.by(() => [
    {
      label: t('task.disputes.admin_detail.stats.timeline', {}, 'Timeline'),
      value: timeline.length,
      note: t('task.disputes.admin_detail.stats.timeline_note', {}, 'Total recorded milestones.'),
      tone: 'border-border bg-card',
    },
    {
      label: t('task.disputes.admin_detail.stats.discussion', {}, 'Discussion'),
      value: comments.length,
      note: t('task.disputes.admin_detail.stats.discussion_note', {}, 'Exchanges between involved parties.'),
      tone: 'border-border/70 bg-card',
    },
    {
      label: t('task.disputes.admin_detail.stats.evidence', {}, 'Evidence'),
      value: evidences.length,
      note: t('task.disputes.admin_detail.stats.evidence_note', {}, 'Files, links, comments, and supporting proof.'),
      tone: 'border-border/70 bg-card',
    },
    {
      label: t('task.disputes.admin_detail.stats.readiness', {}, 'Decision readiness'),
      value: isClassicReviewDispute
        ? latestCaseFile
          ? `${latestCaseFile.completeness_score}%`
          : '0%'
        : hasRuntimeContext
          ? t('task.disputes.admin_detail.runtime', {}, 'Runtime')
          : t('task.disputes.admin_detail.context_unknown', {}, 'Context?'),
      note: isClassicReviewDispute
        ? latestCaseFile
          ? t('task.disputes.admin_detail.stats.readiness_case_file_ready', {}, 'Latest case file completeness.')
          : t('task.disputes.admin_detail.stats.readiness_case_file_missing', {}, 'No case file snapshot yet.')
        : hasRuntimeContext
          ? t('task.disputes.admin_detail.stats.readiness_runtime_ready', {}, 'Uses sprint/project runtime context instead of a case file.')
          : t('task.disputes.admin_detail.stats.readiness_runtime_missing', {}, 'No runtime context for inspecting sprint/project scope.'),
      tone: 'border-border/70 bg-card',
    },
  ])
  const systemSignals = $derived.by(() => [
    {
      label: isClassicReviewDispute
        ? t('task.disputes.admin_detail.signals.case_file', {}, 'Case file')
        : t('task.disputes.admin_detail.signals.runtime_context', {}, 'Runtime context'),
      value: isClassicReviewDispute
        ? latestCaseFile
          ? `v${latestCaseFile.case_version}`
          : t('task.disputes.admin_detail.case_file_missing', {}, 'Not built')
        : hasRuntimeContext
          ? sourceLabel
          : t('task.disputes.admin_detail.missing_context', {}, 'Missing context'),
      note: isClassicReviewDispute
        ? latestCaseFile
          ? t(
              'task.disputes.admin_detail.signals.snapshot_at',
              { time: new Date(latestCaseFile.created_at).toLocaleString(documentLocale) },
              'Snapshot at :time'
            )
          : t('task.disputes.admin_detail.signals.create_snapshot_first', {}, 'Build a snapshot before concluding.')
        : runtimeScope || t('task.disputes.admin_detail.signals.runtime_scope_fallback', {}, 'Inspect related organization, project, sprint, and task runtime package.'),
    },
    {
      label: t('task.disputes.admin_detail.signals.ai_council', {}, 'AI council'),
      value: latestAiEvaluation?.status ?? t('task.disputes.admin_detail.signals.ai_not_called', {}, 'Not called'),
      note: latestAiEvaluation?.summary ?? t('task.disputes.admin_detail.signals.ai_call_hint', {}, 'AI Council can help when the dispute is complex.'),
    },
  ])

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
      await axios.post(`/api/reviews/disputes/${dispute.id}/comments`, {
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

  async function buildCaseFile() {
    if (buildingCaseFile || !isClassicReviewDispute) return
    buildingCaseFile = true
    errorMsg = ''
    successMsg = ''
    try {
      await axios.post(`/api/admin/reviews/disputes/${dispute.id}/case-files`)
      router.reload({ only: ['case_files'] })
      successMsg = t('task.disputes.admin_detail.case_file_success', {}, 'Case file snapshot created successfully.')
    } catch (error: unknown) {
      errorMsg = extractApiErrorMessage(error, t('task.disputes.admin_detail.case_file_error', {}, 'Unable to create case file.'))
    } finally {
      buildingCaseFile = false
    }
  }

  async function startAiEvaluation() {
    if (startingAi) return
    startingAi = true
    errorMsg = ''
    successMsg = ''
    try {
      await axios.post(`/api/admin/reviews/disputes/${dispute.id}/ai-evaluations`, {
        provider: 'ai_council',
        sourceType,
      })
      router.reload({ only: ['ai_evaluations'] })
      successMsg = t('task.disputes.admin_detail.ai_success', {}, 'AI Council evaluation requested.')
    } catch (error: unknown) {
      errorMsg = extractApiErrorMessage(error, t('task.disputes.admin_detail.ai_error', {}, 'Unable to call AI.'))
    } finally {
      startingAi = false
    }
  }

  async function resolveDispute() {
    if (!finalRationale.trim() || resolving) return
    resolving = true
    errorMsg = ''
    successMsg = ''
    try {
      await axios.post(`/api/admin/reviews/disputes/${dispute.id}/resolve`, {
        finalDecision,
        finalRationale: finalRationale.trim(),
        overrideReadiness,
        overrideReason: overrideReadiness ? overrideReason.trim() : undefined,
        profileUpdateAction: profileUpdateAction === 'no_action' ? undefined : profileUpdateAction,
        reviewerCredibilityAction:
          reviewerCredibilityAction === 'no_action' ? undefined : reviewerCredibilityAction,
        sourceType,
      })
      router.reload()
      successMsg = t('task.disputes.admin_detail.resolve_success', {}, 'Dispute resolved successfully.')
    } catch (error: unknown) {
      errorMsg = extractApiErrorMessage(error, t('task.disputes.admin_detail.resolve_error', {}, 'Unable to resolve dispute.'))
    } finally {
      resolving = false
    }
  }
</script>

<svelte:head>
  <title>{pageTitle}</title>
</svelte:head>

<div class="space-y-6">
  <section class="rounded-[32px] border border-border bg-card p-6 shadow-xs">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div class="max-w-3xl">
        <p class="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
          {t('task.disputes.admin_detail.eyebrow', {}, 'Admin decision room')}
        </p>
        <h1 class="mt-2 text-3xl font-black tracking-tight text-foreground sm:text-4xl">
          {t('task.disputes.admin_detail.title', {}, 'Review dispute resolution')}
        </h1>
        <p class="mt-3 text-sm leading-6 text-muted-foreground">
          {t('task.disputes.admin_detail.subtitle', {}, 'Admin decision room: combine reviews, comments, evidence, case files, and AI advice into an auditable conclusion.')}
        </p>
        <div class="mt-4 flex flex-wrap gap-2">
          <span class={`rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] ${openDispute ? 'border-border/70 bg-muted/40 text-foreground' : 'border-border/70 bg-muted/40 text-foreground'}`}>
            {openDispute ? t('task.disputes.admin_detail.processing', {}, 'In progress') : t('task.disputes.admin_detail.concluded', {}, 'Concluded')}
          </span>
          <span class="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {sourceLabel}: {disputeReviewType}
          </span>
          <span class="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {t('task.disputes.admin_detail.reviewee', {}, 'Reviewee')}: {dispute.reviewee_username ?? dispute.reviewee_id.slice(0, 8)}
          </span>
          {#if dispute.review_session_status}
            <span class="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {t('task.disputes.admin_detail.session', {}, 'Session')}: {dispute.review_session_status}
            </span>
          {/if}
        </div>
      </div>

      <div class="grid min-w-[280px] gap-3 sm:grid-cols-2">
        {#each systemSignals as signal}
          <div class="rounded-2xl border border-border/80 bg-background/85 p-4">
            <div class="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {signal.label}
            </div>
            <div class="mt-2 text-lg font-bold text-foreground">{signal.value}</div>
            <p class="mt-2 text-xs leading-5 text-muted-foreground">{signal.note}</p>
          </div>
        {/each}
      </div>
    </div>

    <div class="mt-5 grid gap-3 lg:grid-cols-4">
      {#each overviewStats as stat}
        <div class={`rounded-2xl border p-4 ${stat.tone}`}>
          <div class="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {stat.label}
          </div>
          <div class="mt-2 text-3xl font-black text-foreground">{stat.value}</div>
          <p class="mt-2 text-sm text-muted-foreground">{stat.note}</p>
        </div>
      {/each}
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

  <Tabs value={activeTab} onValueChange={(value) => { activeTab = value as AdminDisputeTab }}>
    <TabsList class="flex h-auto flex-wrap justify-start gap-2 rounded-[24px] border border-border bg-background/80 p-2">
      <TabsTrigger value="overview">{t('task.disputes.admin_detail.tabs.overview', {}, 'Overview')}</TabsTrigger>
      <TabsTrigger value="timeline">{t('task.disputes.admin_detail.tabs.timeline', {}, 'Timeline')}</TabsTrigger>
      <TabsTrigger value="discussion">{t('task.disputes.admin_detail.tabs.discussion', {}, 'Discussion')}</TabsTrigger>
      <TabsTrigger value="evidence">{t('task.disputes.admin_detail.tabs.evidence', {}, 'Evidence')}</TabsTrigger>
      <TabsTrigger value="resolve">{t('task.disputes.admin_detail.tabs.resolve', {}, 'Resolve')}</TabsTrigger>
    </TabsList>

    <TabsContent value="overview" class="mt-4">
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

    <TabsContent value="resolve" class="mt-4">
      <DisputeResolveTab
        {dispute}
        caseFiles={case_files}
        aiEvaluations={ai_evaluations}
        buildingCaseFile={buildingCaseFile}
        startingAi={startingAi}
        resolving={resolving}
        bind:finalDecision
        bind:profileUpdateAction
        bind:reviewerCredibilityAction
        bind:finalRationale
        bind:overrideReadiness
        bind:overrideReason
        onBuildCaseFile={buildCaseFile}
        onStartAi={startAiEvaluation}
        onResolve={resolveDispute}
      />
    </TabsContent>
  </Tabs>
</div>
