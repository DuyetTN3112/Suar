<script lang="ts">
  import Card from '@/apps/admin/shared/ui/card.svelte'
  import CardContent from '@/apps/admin/shared/ui/card_content.svelte'
  import CardHeader from '@/apps/admin/shared/ui/card_header.svelte'
  import CardTitle from '@/apps/admin/shared/ui/card_title.svelte'
  import Badge from '@/apps/admin/shared/ui/badge.svelte'
  import Button from '@/apps/admin/shared/ui/button.svelte'
  import { currentDocumentLocale } from '@/apps/admin/shared/lib/date_locale'
  import { useTranslation } from '@/apps/admin/shared/stores/translation.svelte'
  import {
    getDisputeRuntimeContext,
    getDisputeReviewType,
    getDisputeSourceType,
    getRuntimeContextItems,
  } from '../types/dispute_resolve_types'
  import type { Dispute, CaseFile, AiEvaluation, RuntimeContextEntity } from '../types/dispute_resolve_types'
  import DisputeEvidenceList from './dispute_evidence_list.svelte'
  import DisputeResolutionForm from './dispute_resolution_form.svelte'

  interface Props {
    dispute: Dispute
    caseFiles: CaseFile[]
    aiEvaluations: AiEvaluation[]
    buildingCaseFile: boolean
    startingAi: boolean
    resolving: boolean
    finalDecision: 'uphold_review' | 'adjust_score' | 'request_re_review' | 'dismiss_dispute' | 'partially_accept'
    profileUpdateAction: 'recalculate_after_adjustment' | 'no_action'
    reviewerCredibilityAction: 'mark_disputed_review' | 'no_action'
    finalRationale: string
    overrideReadiness?: boolean
    overrideReason?: string
    onBuildCaseFile: () => void
    onStartAi: () => void
    onResolve: () => void
  }

  let {
    dispute,
    caseFiles,
    aiEvaluations,
    buildingCaseFile,
    startingAi,
    resolving,
    finalDecision = $bindable(),
    profileUpdateAction = $bindable(),
    reviewerCredibilityAction = $bindable(),
    finalRationale = $bindable(),
    overrideReadiness = $bindable(false),
    overrideReason = $bindable(''),
    onBuildCaseFile,
    onStartAi,
    onResolve,
  }: Props = $props()

  const { t } = useTranslation()
  const documentLocale = $derived(currentDocumentLocale() === 'vi' ? 'vi-VN' : 'en-US')
  const dateTimeFormatter = $derived(
    new Intl.DateTimeFormat(documentLocale, {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  )

  const REQUIRED_DOSSIER_KEYS = new Set([
    'task_snapshot',
    'assignment_snapshot',
    'submission_snapshot',
    'review_snapshot',
    'skill_reviews_snapshot',
    'dispute_claim_snapshot',
    'reviewee_dispute_message',
    'counterparty_dispute_message',
  ])

	  const latestCaseFile = $derived(caseFiles[0] ?? null)
	  const latestAiEvaluation = $derived(aiEvaluations[0] ?? null)
	  const hasCompletedAiEvaluation = $derived(
	    aiEvaluations.some((evaluation) => evaluation.status === 'completed')
	  )
	  const sourceType = $derived(getDisputeSourceType(dispute))
	  const isClassicReviewDispute = $derived(sourceType === 'review_dispute')
	  const disputeReviewType = $derived(getDisputeReviewType(dispute))
	  const runtimeContext = $derived(getDisputeRuntimeContext(dispute))
	  const hasRuntimeContext = $derived(Object.keys(runtimeContext).length > 0)
	  const sprintPeerTasks = $derived(
	    getRuntimeContextItems(runtimeContext, 'sprint_peer_tasks', 'sprintPeerTasks')
	  )
	  const relatedProjectTasks = $derived(
	    getRuntimeContextItems(runtimeContext, 'related_project_tasks', 'relatedProjectTasks')
	  )
	  const runtimeTasks = $derived.by(() => {
	    const seen = new Set<string>()
	    const rows: Record<string, unknown>[] = []
	    for (const task of [...sprintPeerTasks, ...relatedProjectTasks]) {
	      const key = typeof task.id === 'string' && task.id ? task.id : JSON.stringify(task)
	      if (seen.has(key)) continue
	      seen.add(key)
	      rows.push(task)
	    }
	    return rows
	  })
	  const managerReviews = $derived(
	    getRuntimeContextItems(runtimeContext, 'manager_reviews', 'managerReviews')
	  )
	  const environmentReviews = $derived(
	    getRuntimeContextItems(runtimeContext, 'environment_reviews', 'environmentReviews')
	  )
  function formatDateTime(value: string): string {
    return dateTimeFormatter.format(new Date(value))
  }

  function confidenceLabel(value: number | string | null | undefined): string | null {
    if (value === null || value === undefined || value === '') return null
    const confidence = Number(value)
    if (!Number.isFinite(confidence)) return null
    const percent = Math.round(confidence * 100)
    return t('task.disputes.admin_detail.resolve.confidence', { percent }, `Confidence: ${percent}%`)
  }
	  const runtimeScope = $derived.by(() => {
	    const organizationName =
	      runtimeContext.organization?.name ??
	      dispute.organization_name ??
	      dispute.organizationName ??
	      dispute.organization_id ??
	      dispute.organizationId
	    const projectName =
	      runtimeContext.project?.name ??
	      dispute.project_name ??
	      dispute.projectName ??
	      dispute.project_id ??
	      dispute.projectId
	    const sprintName =
	      runtimeContext.sprint?.name ??
	      dispute.sprint_name ??
	      dispute.sprintName ??
	      dispute.sprint_id ??
	      dispute.sprintId
	    const taskName =
	      runtimeContext.task?.title ??
	      runtimeContext.task?.name ??
	      dispute.task_title ??
	      dispute.taskTitle ??
	      dispute.task_id ??
	      dispute.taskId

	    return {
	      organization: organizationName ?? t('task.disputes.admin_detail.resolve.not_available', {}, 'N/A'),
	      project: projectName ?? t('task.disputes.admin_detail.resolve.not_available', {}, 'N/A'),
	      sprint: sprintName ?? t('task.disputes.admin_detail.resolve.not_available', {}, 'N/A'),
	      task: taskName ?? t('task.disputes.admin_detail.resolve.not_available', {}, 'N/A'),
	    }
	  })
	  const sourceLabel = $derived(
	    t(
	      `task.disputes.index.source.${sourceType}`,
	      {},
	      sourceType === 'sprint_review_dispute'
	        ? 'Sprint review dispute'
	        : sourceType === 'sprint_reverse_review_workflow'
	          ? 'Reverse review dispute'
	          : sourceType === 'task_review_workflow'
	            ? 'Task review workflow'
	            : 'Task review dispute'
	    )
	  )
	  const statusLabel = $derived(
	    t(`task.disputes.index.status.${dispute.status}`, {}, dispute.status.toUpperCase())
	  )
	  const finalDecisionLabel = $derived(
	    dispute.final_decision
	      ? t(`task.disputes.index.final_decision.${dispute.final_decision}`, {}, dispute.final_decision)
	      : ''
	  )
	  const latestCaseFileCounts = $derived.by(() => ({
	    taskComments: latestCaseFile?.task_comments_snapshot?.length ?? 0,
    taskHistory: latestCaseFile?.task_history_snapshot?.length ?? 0,
    evidences: latestCaseFile?.evidences_snapshot?.length ?? 0,
    skillReviews: latestCaseFile?.skill_reviews_snapshot?.length ?? 0,
    disputeMessages:
      latestCaseFile?.dispute_claim_snapshot?.dispute_comments?.length ?? 0,
  }))
  const taskCommentPreview = $derived(
    (latestCaseFile?.task_comments_snapshot ?? []).slice(0, 3)
  )
  const taskHistoryPreview = $derived(
    (latestCaseFile?.task_history_snapshot ?? []).slice(0, 3)
  )
  const disputeMessagePreview = $derived(
    (latestCaseFile?.dispute_claim_snapshot?.dispute_comments ?? []).slice(0, 3)
  )
  const evidencePreview = $derived(
    (latestCaseFile?.evidences_snapshot ?? []).slice(0, 3)
  )
  const missingDataPreview = $derived(latestCaseFile?.missing_data ?? [])
  const missingRequiredData = $derived(
    missingDataPreview.filter((item) => REQUIRED_DOSSIER_KEYS.has(item))
  )
	  const missingRecommendedData = $derived(
	    missingDataPreview.filter((item) => !REQUIRED_DOSSIER_KEYS.has(item))
	  )
	  const normalResolveBlocked = $derived(
	    isClassicReviewDispute && (!latestCaseFile || missingRequiredData.length > 0)
	  )
	  const canResolve = $derived(
	    finalRationale.trim().length > 0 &&
	      (!normalResolveBlocked || (overrideReadiness && overrideReason.trim().length > 0))
	  )
	  const readinessSignals = $derived([
	    {
	      label: isClassicReviewDispute
	        ? t('task.disputes.admin_detail.resolve.case_file', {}, 'Case file')
	        : t('task.disputes.admin_detail.resolve.runtime_context', {}, 'Runtime context'),
	      ready: isClassicReviewDispute ? caseFiles.length > 0 : hasRuntimeContext,
	      note: isClassicReviewDispute
	        ? latestCaseFile
	          ? t(
	              'task.disputes.admin_detail.resolve.latest_case_file_note',
	              {
	                version: latestCaseFile.case_version,
	                score: latestCaseFile.completeness_score,
	              },
	              `Latest v${latestCaseFile.case_version} with ${latestCaseFile.completeness_score}% completeness.`
	            )
	          : t('task.disputes.admin_detail.resolve.no_case_file_note', {}, 'No combined data snapshot yet.')
	        : hasRuntimeContext
	          ? t('task.disputes.admin_detail.resolve.has_runtime_context_note', {}, 'Organization, project, sprint, and task context are available for inspection.')
	          : t('task.disputes.admin_detail.resolve.no_runtime_context_note', {}, 'Runtime context is missing from the sprint dispute package.'),
	    },
	    {
	      label: isClassicReviewDispute
	        ? t('task.disputes.admin_detail.resolve.required_dossier', {}, 'Required dossier')
	        : t('task.disputes.admin_detail.resolve.related_runtime_data', {}, 'Related sprint/project data'),
	      ready: !normalResolveBlocked,
	      note: isClassicReviewDispute
	        ? !latestCaseFile
	          ? t('task.disputes.admin_detail.resolve.no_case_file_blocked_note', {}, 'No case file yet. Normal resolve is blocked.')
	          : missingRequiredData.length === 0
	            ? t('task.disputes.admin_detail.resolve.required_dossier_ready_note', {}, 'Required data is complete for normal resolve.')
	            : t(
	                'task.disputes.admin_detail.resolve.required_dossier_missing_note',
	                { fields: missingRequiredData.join(', ') },
	                `Missing required data: ${missingRequiredData.join(', ')}.`
	              )
	        : t(
	            'task.disputes.admin_detail.resolve.runtime_counts_note',
	            {
	              tasks: runtimeTasks.length,
	              managerReviews: managerReviews.length,
	              environmentReviews: environmentReviews.length,
	            },
	            `Related tasks: ${runtimeTasks.length}. Manager reviews: ${managerReviews.length}. Environment reviews: ${environmentReviews.length}.`
	          ),
	    },
    {
      label: t('task.disputes.admin_detail.resolve.ai_council', {}, 'AI council'),
      ready: hasCompletedAiEvaluation,
      note: latestAiEvaluation
        ? t(
            'task.disputes.admin_detail.resolve.latest_ai_note',
            { status: latestAiEvaluation.status },
            `Latest run is ${latestAiEvaluation.status}.`
          )
        : t('task.disputes.admin_detail.resolve.no_ai_note', {}, 'No supporting AI opinion yet.'),
    },
    {
      label: t('task.disputes.admin_detail.resolve.decision_rationale', {}, 'Decision rationale'),
      ready: finalRationale.trim().length > 0,
      note: finalRationale.trim()
        ? t('task.disputes.admin_detail.resolve.rationale_ready_note', {}, 'Rationale is entered and ready to issue.')
        : t('task.disputes.admin_detail.resolve.rationale_missing_note', {}, 'Final admin rationale is missing.'),
	    },
	  ])

	  function labelForEntity(
	    entity: RuntimeContextEntity | Record<string, unknown> | null | undefined,
	    fallback: string
	  ): string {
	    const value = entity?.['name'] ?? entity?.['title'] ?? entity?.['username'] ?? entity?.['id']
	    return typeof value === 'string' && value.length > 0 ? value : fallback
	  }
	</script>

<div class="space-y-6">
  <Card class="rounded-[28px] border-border/90 bg-card">
    <CardHeader class="flex flex-row items-center justify-between space-y-0">
      <div>
        <div class="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          {t('task.disputes.admin_detail.resolve.resolution_status', {}, 'Resolution status')}
        </div>
        <CardTitle class="mt-2 text-2xl">
          {t('task.disputes.admin_detail.resolve.status_title', {}, 'Resolution status')}
        </CardTitle>
      </div>
      <Badge variant={dispute.status === 'resolved' ? 'default' : 'secondary'} class="font-mono text-[10px]">
        {statusLabel}
      </Badge>
    </CardHeader>
    <CardContent class="space-y-4 text-sm font-sans">
      <div>
        <p class="font-semibold text-muted-foreground">{t('task.disputes.admin_detail.resolve.created_at', {}, 'Created at')}</p>
        <p class="font-medium font-mono">{formatDateTime(dispute.created_at)}</p>
      </div>
      {#if dispute.final_decision}
        <div>
          <p class="font-semibold text-muted-foreground">{t('task.disputes.admin_detail.resolve.final_decision', {}, 'Final decision')}</p>
          <Badge variant="default" class="mt-1 font-mono">{finalDecisionLabel}</Badge>
        </div>
        <div>
          <p class="font-semibold text-muted-foreground">{t('task.disputes.admin_detail.resolve.rationale', {}, 'Rationale')}</p>
          <p class="mt-1 text-muted-foreground">{dispute.final_rationale}</p>
        </div>
      {/if}
    </CardContent>
  </Card>

	  {#if isClassicReviewDispute}
	    <DisputeEvidenceList
	      {dispute}
	      {caseFiles}
	      {buildingCaseFile}
	      {readinessSignals}
	      {normalResolveBlocked}
	      {missingRequiredData}
	      {missingRecommendedData}
	      {missingDataPreview}
	      {latestCaseFileCounts}
	      {taskCommentPreview}
	      {taskHistoryPreview}
	      {disputeMessagePreview}
	      {evidencePreview}
	      {onBuildCaseFile}
	    />
	  {:else}
	    <div class="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
	      <Card class="rounded-[28px] border-border/90">
	        <CardHeader>
	          <div class="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
	            {t('task.disputes.admin_detail.resolve.runtime_context', {}, 'Runtime context')}
	          </div>
	          <CardTitle class="mt-2 text-2xl">{sourceLabel}</CardTitle>
	        </CardHeader>
	        <CardContent class="space-y-4 font-sans text-sm">
	          <div class="grid gap-3 md:grid-cols-4">
	            <div class="rounded-2xl border border-border/70 bg-background/75 p-4">
	              <p class="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
	                {t('task.disputes.admin_detail.resolve.organization', {}, 'Organization')}
	              </p>
	              <p class="mt-2 font-bold text-foreground">{runtimeScope.organization}</p>
	            </div>
	            <div class="rounded-2xl border border-border/70 bg-background/75 p-4">
	              <p class="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
	                {t('task.disputes.admin_detail.resolve.project', {}, 'Project')}
	              </p>
	              <p class="mt-2 font-bold text-foreground">{runtimeScope.project}</p>
	            </div>
	            <div class="rounded-2xl border border-border/70 bg-background/75 p-4">
	              <p class="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
	                {t('task.disputes.admin_detail.resolve.sprint', {}, 'Sprint')}
	              </p>
	              <p class="mt-2 font-bold text-foreground">{runtimeScope.sprint}</p>
	            </div>
	            <div class="rounded-2xl border border-border/70 bg-background/75 p-4">
	              <p class="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
	                {t('task.disputes.admin_detail.resolve.task', {}, 'Task')}
	              </p>
	              <p class="mt-2 font-bold text-foreground">{runtimeScope.task}</p>
	            </div>
	          </div>

	          <div class="grid gap-4 lg:grid-cols-2">
	            <div class="rounded-2xl border border-border/70 bg-muted/40 p-4">
	              <p class="text-sm font-semibold text-foreground">
	                {t('task.disputes.admin_detail.resolve.runtime_tasks_title', {}, 'Tasks in sprint/project')}
	              </p>
	              {#if runtimeTasks.length === 0}
	                <p class="mt-2 text-sm text-muted-foreground">
	                  {t('task.disputes.admin_detail.resolve.no_runtime_tasks', {}, 'No peer tasks in the runtime package.')}
	                </p>
	              {:else}
	                <div class="mt-3 space-y-2">
	                  {#each runtimeTasks.slice(0, 5) as task, index}
	                    <div class="rounded-2xl border border-border/70 bg-card p-3">
	                      <p class="font-semibold text-foreground">
	                        {labelForEntity(task, `Task ${index + 1}`)}
	                      </p>
	                    </div>
	                  {/each}
	                </div>
	              {/if}
	            </div>

	            <div class="rounded-2xl border border-border/70 bg-muted/40 p-4">
	              <p class="text-sm font-semibold text-foreground">
	                {t('task.disputes.admin_detail.resolve.review_context', {}, 'Review context')}
	              </p>
	              <div class="mt-3 grid gap-3 sm:grid-cols-3">
	                <div class="rounded-xl border border-border/70 bg-card p-3">
	                  <p class="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
	                    {t('task.disputes.admin_detail.resolve.type', {}, 'Type')}
	                  </p>
	                  <p class="mt-2 font-mono text-xs font-bold text-foreground">{disputeReviewType}</p>
	                </div>
	                <div class="rounded-xl border border-border/70 bg-card p-3">
	                  <p class="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
	                    {t('task.disputes.admin_detail.resolve.manager', {}, 'Manager')}
	                  </p>
	                  <p class="mt-2 text-2xl font-black text-foreground">{managerReviews.length}</p>
	                </div>
	                <div class="rounded-xl border border-border/70 bg-card p-3">
	                  <p class="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
	                    {t('task.disputes.admin_detail.resolve.environment', {}, 'Environment')}
	                  </p>
	                  <p class="mt-2 text-2xl font-black text-foreground">{environmentReviews.length}</p>
	                </div>
	              </div>
	            </div>
	          </div>
	        </CardContent>
	      </Card>

	      <Card class="rounded-[28px] border-border/90">
	        <CardHeader>
	          <div class="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
	            {t('task.disputes.admin_detail.resolve.decision_readiness', {}, 'Decision readiness')}
	          </div>
	          <CardTitle class="mt-2 text-2xl">
	            {t('task.disputes.admin_detail.resolve.pre_decision_checklist', {}, 'Pre-decision checklist')}
	          </CardTitle>
	        </CardHeader>
	        <CardContent class="space-y-3">
	          {#each readinessSignals as signal}
	            <div class={`rounded-2xl border p-4 ${signal.ready ? 'border-border/70 bg-muted/40' : 'border-border/70 bg-muted/40'}`}>
	              <div class="flex items-center justify-between gap-3">
	                <p class="font-semibold text-foreground">{signal.label}</p>
	                <Badge variant={signal.ready ? 'default' : 'secondary'} class="rounded-full px-2.5 py-1 text-[10px] font-mono">
	                  {signal.ready
	                    ? t('task.disputes.admin_detail.resolve.ready', {}, 'READY')
	                    : t('task.disputes.admin_detail.resolve.waiting', {}, 'WAITING')}
	                </Badge>
	              </div>
	              <p class="mt-2 text-sm leading-6 text-muted-foreground">{signal.note}</p>
	            </div>
	          {/each}
	        </CardContent>
	      </Card>
	    </div>
	  {/if}

  <Card class="rounded-[28px] border-border/90">
    <CardHeader class="flex flex-row items-center justify-between space-y-0">
      <div>
        <div class="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          {t('task.disputes.admin_detail.resolve.advisory_layer', {}, 'Advisory layer')}
        </div>
        <CardTitle class="mt-2 text-2xl">
          {t('task.disputes.admin_detail.resolve.ai_support_count', { count: aiEvaluations.length }, `AI support (${aiEvaluations.length})`)}
        </CardTitle>
      </div>
	      {#if dispute.status !== 'resolved' && dispute.status !== 'rejected' && (isClassicReviewDispute ? caseFiles.length > 0 : hasRuntimeContext)}
	        <Button size="sm" onclick={onStartAi} disabled={startingAi}>
          {startingAi
            ? t('task.disputes.admin_detail.resolve.sending_ai', {}, 'Sending...')
            : t('task.disputes.admin_detail.resolve.call_ai', {}, 'Call AI')}
        </Button>
      {/if}
    </CardHeader>
    <CardContent>
      {#if aiEvaluations.length === 0}
        <p class="text-sm text-muted-foreground">
          {t('task.disputes.admin_detail.resolve.no_ai_evaluations', {}, 'No AI evaluations yet.')}
        </p>
      {:else}
        <div class="space-y-3 font-sans text-xs">
          {#each aiEvaluations as ai (ai.id)}
            <div class="rounded-[22px] border border-border bg-card p-4 text-xs">
              <div class="mb-1 flex items-center justify-between font-sans">
                <span class="font-bold uppercase font-mono">{ai.provider}</span>
                <Badge variant="outline" class="font-mono text-[9px]">{ai.status}</Badge>
              </div>
              {#if ai.recommendation}
                <div class="mt-2 font-sans">
                  <span class="font-semibold text-muted-foreground">
                    {t('task.disputes.admin_detail.resolve.recommendation', {}, 'Recommendation')}:
                  </span>
                  <Badge variant="secondary" class="ml-1 font-mono text-[9px]">{ai.recommendation}</Badge>
                </div>
              {/if}
              {#if confidenceLabel(ai.confidence_score)}
                <p class="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                  {confidenceLabel(ai.confidence_score)}
                </p>
              {/if}
              {#if ai.summary}
                <p class="mt-1 text-muted-foreground font-sans">{ai.summary}</p>
              {/if}
              {#if ai.error_message}
                <div class="mt-3 rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-destructive">
                  <p class="font-semibold">
                    {t('task.disputes.admin_detail.resolve.ai_error', {}, 'AI error')}
                  </p>
                  <p class="mt-1 font-mono text-[11px] leading-5">{ai.error_message}</p>
                </div>
              {/if}
            </div>
          {/each}
        </div>
      {/if}
    </CardContent>
  </Card>

  {#if dispute.status !== 'resolved' && dispute.status !== 'rejected'}
    <DisputeResolutionForm
      bind:finalDecision
      bind:profileUpdateAction
      bind:reviewerCredibilityAction
      bind:finalRationale
      bind:overrideReadiness
      bind:overrideReason
      {normalResolveBlocked}
      {resolving}
      {canResolve}
      {onResolve}
    />
  {/if}
</div>
