<script lang="ts">
  import axios from 'axios'
  import { onMount } from 'svelte'

  import {
    buildTaskCompletionReportPayload,
    type CompletionAutonomy,
    type CompletionContributorClaimDraft,
    type CompletionCriterionDraft,
    type CompletionCriterionResult,
    type CompletionDeviationStatus,
    type CompletionEvidenceDraft,
    mergeExistingContributorClaims,
    type CompletionOwnership,
    type CompletionPrivacy,
    type CompletionReportPayloadContext,
  } from './task_completion_report_payload'
  import type {
    NativeCompletionBrief,
    NativeCompletionReportTranslate,
  } from './task_completion_report_native_form.types'

  interface NativeReportCriterion {
    id: string
    criterionId: string
    expectedOutcome: string
    actualOutcome: string
    result: CompletionCriterionResult
    explanation: string
    evidenceIds: readonly string[]
    deviationStatus?: CompletionDeviationStatus
    deviationSummary?: string | null
    deviationApprovalRef?: string | null
    notApplicableReason?: string | null
    notApplicablePolicyRef?: string | null
  }

  interface NativeReportEvidence {
    id: string
    evidenceRequirementIds: readonly string[]
    criterionIds: readonly string[]
    deliverableIds: readonly string[]
    ownerUserId?: string | null
    contributorUserIds?: readonly string[]
    reviewerAccessState: CompletionEvidenceDraft['reviewerAccessState']
    availability: CompletionEvidenceDraft['availability']
    privacyClassification: CompletionPrivacy
  }

  interface NativeReportClaim {
    id: string
    contributorUserId: string
    actualRole: string
    actualOwnership: CompletionOwnership
    contributionStatement: string
    deliverableIds: readonly string[]
    criterionResultIds: readonly string[]
    evidenceIds: readonly string[]
  }

  interface NativeReportValue {
    id: string
    taskSubmissionId: string
    taskId: string
    taskAssignmentId: string
    assignmentSnapshotId: string
    assignmentSnapshotHash: string
    taskContractVersionId: string
    reportedBy: string
    revision: number
    status: 'draft' | 'submitted'
    report: {
      workPerformed: string
      contributionStatement: string
      actualRole: string
      actualOwnership: CompletionOwnership | null
      actualAutonomy: CompletionAutonomy | null
      actualOutcomes: Record<string, unknown>
      impactObserved: Record<string, unknown>
      limitations: string | null
      remainingWork: string | null
      actualDeliverableIds: readonly string[]
      criterionResults: readonly NativeReportCriterion[]
      evidence: readonly NativeReportEvidence[]
      contributorClaims: readonly NativeReportClaim[]
    }
    evidenceManifest: readonly {
      evidenceId: string
      evidenceType: string
      title: string
      description?: string | null
      uri?: string | null
      storageReference?: string | null
      versionReference?: string | null
      contentHash?: string | null
      capturedAt?: string | null
    }[]
  }

  interface StartValue {
    taskSubmissionId: string
    taskId: string
    taskAssignmentId: string
    assigneeId: string
    assignmentSnapshotId: string
    assignmentSnapshotHash: string
    taskContractVersionId: string
    status: 'draft' | 'submitted' | 'accepted_for_review' | 'needs_changes' | 'locked'
    replayed: boolean
  }

  interface Props {
    taskId: string
    assigneeId?: string | null
    brief: NativeCompletionBrief
    translate?: NativeCompletionReportTranslate
  }

  interface Envelope<T> {
    data: T
  }

  type Field =
    | 'actualOutcome'
    | 'explanation'
    | 'result'
    | 'deviationStatus'
    | 'deviationSummary'
    | 'deviationApprovalRef'
    | 'notApplicableReason'
    | 'notApplicablePolicyRef'

  const props: Props = $props()

  function t(key: string, fallback: string, params: Record<string, unknown> = {}): string {
    return props.translate?.(key, params, fallback) ?? fallback
  }

  const criteria = $derived(props.brief.resolvedContract?.work?.acceptanceCriteria ?? [])
  const deliverables = $derived(props.brief.resolvedContract?.work?.deliverables ?? [])
  const evidenceRequirements = $derived(
    props.brief.resolvedContract?.evidence?.requirements ?? []
  )
  const assignmentId = $derived(props.brief.assignmentId ?? '')

  let loading = $state(true)
  let saving = $state(false)
  let submitting = $state(false)
  let error = $state('')
  let success = $state('')
  let report = $state<NativeReportValue | null>(null)
  let started = $state<StartValue | null>(null)
  let taskSubmissionId = $state('')
  let expectedRevision = $state(0)
  let claimId = $state('')

  let workPerformed = $state('')
  let contributionStatement = $state('')
  let actualOutcomes = $state('')
  let impactObserved = $state('')
  let limitations = $state('')
  let remainingWork = $state('')
  let actualRole = $state('')
  let actualOwnership = $state<CompletionOwnership | null>(null)
  let actualAutonomy = $state<CompletionAutonomy | null>(null)
  let selectedDeliverableIds = $state<string[]>([])
  let criterionDrafts = $state<Record<string, CompletionCriterionDraft>>({})
  let evidence = $state<CompletionEvidenceDraft[]>([])
  let contributorClaims = $state<NativeReportClaim[]>([])

  let evidenceTitle = $state('')
  let evidenceType = $state('document_link')
  let evidenceUri = $state('')
  let evidenceDescription = $state('')
  let evidenceRequirementId = $state('')
  let evidenceCriterionId = $state('')
  let evidenceDeliverableId = $state('')
  let evidenceAccess: CompletionEvidenceDraft['reviewerAccessState'] = $state('unknown')
  let evidenceAvailability: CompletionEvidenceDraft['availability'] = $state('not_disclosed')
  let evidencePrivacy: CompletionPrivacy = $state('internal')

  const canEdit = $derived(report?.status !== 'submitted')
  const usableBrief = $derived(
    props.brief.state === 'published' &&
      props.brief.audience === 'work_participant' &&
      props.brief.resolutionSource === 'assignment_snapshot' &&
      Boolean(
        assignmentId &&
          props.brief.assignmentSnapshotId &&
          props.brief.assignmentSnapshotHash &&
          props.brief.contractVersionId &&
          props.brief.resolvedContract?.work &&
          props.brief.resolvedContract?.evidence
      )
  )
  const reportContext = $derived.by<CompletionReportPayloadContext | null>(() => {
    const current = started
    const assigneeId = props.assigneeId ?? current?.assigneeId ?? ''
    const snapshotId = props.brief.assignmentSnapshotId ?? current?.assignmentSnapshotId ?? ''
    const snapshotHash = props.brief.assignmentSnapshotHash ?? current?.assignmentSnapshotHash ?? ''
    const contractVersionId = props.brief.contractVersionId ?? current?.taskContractVersionId ?? ''
    const work = props.brief.resolvedContract?.work
    if (!assignmentId || !assigneeId || !snapshotId || !snapshotHash || !contractVersionId) {
      return null
    }

    return {
      taskId: props.taskId,
      taskAssignmentId: assignmentId,
      taskSubmissionId,
      assignmentSnapshotId: snapshotId,
      assignmentSnapshotHash: snapshotHash,
      taskContractVersionId: contractVersionId,
      reportedBy: assigneeId,
      action: work?.action ?? 'complete',
      object: work?.object ?? 'the assigned task',
      deliverableIds: deliverables.map((item) => item.id),
      criteria: criteria.map((criterion) => ({ id: criterion.id, statement: criterion.statement })),
    }
  })

  function newId(): string {
    return globalThis.crypto?.randomUUID?.() ?? `tva-${Date.now()}-${Math.random().toString(16).slice(2)}`
  }

  function errorMessage(cause: unknown, fallback: string): string {
    if (
      typeof cause === 'object' &&
      cause !== null &&
      'response' in cause &&
      typeof cause.response === 'object' &&
      cause.response !== null &&
      'data' in cause.response &&
      typeof cause.response.data === 'object' &&
      cause.response.data !== null &&
      'message' in cause.response.data &&
      typeof cause.response.data.message === 'string'
    ) {
      return cause.response.data.message
    }
    return cause instanceof Error && cause.message.trim() ? cause.message : fallback
  }

  function resetCriterionDrafts() {
    criterionDrafts = {}
  }

  function syncReport(next: NativeReportValue) {
    report = next
    taskSubmissionId = next.taskSubmissionId
    expectedRevision = next.revision
    workPerformed = next.report.workPerformed ?? ''
    contributionStatement = next.report.contributionStatement ?? ''
    actualRole = next.report.actualRole ?? ''
    actualOwnership = next.report.actualOwnership ?? null
    actualAutonomy = next.report.actualAutonomy ?? null
    actualOutcomes = stringSummary(next.report.actualOutcomes)
    impactObserved = stringSummary(next.report.impactObserved)
    limitations = next.report.limitations ?? ''
    remainingWork = next.report.remainingWork ?? ''
    selectedDeliverableIds = [...next.report.actualDeliverableIds]
    contributorClaims = next.report.contributorClaims.map((claim) => ({
      ...claim,
      deliverableIds: [...claim.deliverableIds],
      criterionResultIds: [...claim.criterionResultIds],
      evidenceIds: [...claim.evidenceIds],
    }))
    claimId =
      contributorClaims.find((claim) => claim.contributorUserId === next.reportedBy)?.id ??
      claimId ??
      newId()

    const nextCriteria: Record<string, CompletionCriterionDraft> = {}
    for (const criterion of criteria) {
      const persisted = next.report.criterionResults.find((item) => item.criterionId === criterion.id)
      if (persisted) {
        nextCriteria[criterion.id] = {
          id: persisted.id,
          actualOutcome: persisted.actualOutcome,
          explanation: persisted.explanation,
          result: persisted.result,
          evidenceIds: [...persisted.evidenceIds],
          deviationStatus: persisted.deviationStatus ?? 'none',
          deviationSummary: persisted.deviationSummary ?? null,
          deviationApprovalRef: persisted.deviationApprovalRef ?? null,
          notApplicableReason: persisted.notApplicableReason ?? null,
          notApplicablePolicyRef: persisted.notApplicablePolicyRef ?? null,
        }
      } else if (criterionDrafts[criterion.id]) {
        nextCriteria[criterion.id] = criterionDrafts[criterion.id]
      }
    }
    criterionDrafts = nextCriteria

    const manifestById = new Map(next.evidenceManifest.map((item) => [item.evidenceId, item]))
    evidence = next.report.evidence.map((item) => {
      const manifest = manifestById.get(item.id)
      return {
        id: item.id,
        evidenceType: manifest?.evidenceType ?? 'document_link',
        title: manifest?.title ?? item.id,
        description: manifest?.description ?? null,
        uri: manifest?.uri ?? null,
        storageReference: manifest?.storageReference ?? null,
        versionReference: manifest?.versionReference ?? null,
        contentHash: manifest?.contentHash ?? null,
        capturedAt: manifest?.capturedAt ?? null,
        evidenceRequirementIds: [...item.evidenceRequirementIds],
        criterionIds: [...item.criterionIds],
        deliverableIds: [...item.deliverableIds],
        ownerUserId: item.ownerUserId ?? next.reportedBy,
        contributorUserIds: [...(item.contributorUserIds ?? [next.reportedBy])],
        reviewerAccessState: item.reviewerAccessState,
        availability: item.availability,
        privacyClassification: item.privacyClassification,
      }
    })
  }

  function stringSummary(value: Record<string, unknown>): string {
    const summary = value['summary']
    return typeof summary === 'string' ? summary : ''
  }

  function setCriterionField(criterionId: string, field: Field, value: string) {
    const current = criterionDrafts[criterionId] ?? {
      id: newId(),
      actualOutcome: '',
      explanation: '',
      evidenceIds: [],
    }
    criterionDrafts = {
      ...criterionDrafts,
      [criterionId]: {
        ...current,
        [field]: field === 'result'
          ? (value as CompletionCriterionResult)
          : field === 'deviationStatus'
            ? (value as CompletionDeviationStatus)
            : value,
      },
    }
  }

  function addEvidence() {
    error = ''
    if (!evidenceTitle.trim() || !evidenceUri.trim()) {
      error = t('task.submission_panel.native.errors.evidence_required', 'Evidence title and URL are required.')
      return
    }
    if (!evidenceRequirementId || !evidenceCriterionId || !evidenceDeliverableId) {
      error = t(
        'task.submission_panel.native.errors.evidence_mapping_required',
        'Map each evidence item to a requirement, criterion, and deliverable.'
      )
      return
    }
    evidence = [
      ...evidence,
      {
        id: newId(),
        evidenceType: evidenceType.trim() || 'document_link',
        title: evidenceTitle.trim(),
        description: evidenceDescription.trim() || null,
        uri: evidenceUri.trim(),
        storageReference: null,
        versionReference: null,
        contentHash: null,
        capturedAt: null,
        evidenceRequirementIds: [evidenceRequirementId],
        criterionIds: [evidenceCriterionId],
        deliverableIds: [evidenceDeliverableId],
        ownerUserId: reportContext?.reportedBy ?? props.assigneeId ?? null,
        contributorUserIds: [reportContext?.reportedBy ?? props.assigneeId ?? ''],
        reviewerAccessState: evidenceAccess,
        availability: evidenceAvailability,
        privacyClassification: evidencePrivacy,
      },
    ]
    evidenceTitle = ''
    evidenceUri = ''
    evidenceDescription = ''
  }

  function removeEvidence(id: string) {
    evidence = evidence.filter((item) => item.id !== id)
  }

  function evidenceIdsForCriterion(criterionId: string): string[] {
    return evidence.filter((item) => item.criterionIds.includes(criterionId)).map((item) => item.id)
  }

  function canSubmitNative(): boolean {
    const acknowledgementReady =
      !props.brief.acknowledgementRequired || props.brief.acknowledgementState === 'acknowledged'
    const criteriaReady = criteria.every((criterion) => {
      const draft = criterionDrafts[criterion.id]
      if (!draft?.result || !draft.actualOutcome.trim() || !draft.explanation.trim()) return false
      if (draft.result !== 'not_applicable' && evidenceIdsForCriterion(criterion.id).length === 0) {
        return false
      }
      if (draft.result === 'not_applicable' &&
        (!draft.notApplicableReason?.trim() || !draft.notApplicablePolicyRef?.trim())) {
        return false
      }
      if (draft.deviationStatus && draft.deviationStatus !== 'none' && !draft.deviationSummary?.trim()) {
        return false
      }
      if (
        (draft.deviationStatus === 'approved' || draft.deviationStatus === 'governed_exception') &&
        !draft.deviationApprovalRef?.trim()
      ) {
        return false
      }
      return true
    })
    const requiredEvidenceReady = evidenceRequirements
      .filter((requirement) => requirement.required)
      .every((requirement) =>
        evidence.some((item) => item.evidenceRequirementIds.includes(requirement.id))
      )
    const evidenceReady = evidence.every(
      (item) => item.reviewerAccessState === 'available' && item.availability === 'available'
    )
    const claim = buildClaims().find(
      (item) => item.contributorUserId === reportContext?.reportedBy
    )
    return Boolean(
      usableBrief &&
        acknowledgementReady &&
        workPerformed.trim() &&
        contributionStatement.trim() &&
        actualRole.trim() &&
        actualOwnership &&
        actualAutonomy &&
        actualOutcomes.trim() &&
        impactObserved.trim() &&
        selectedDeliverableIds.length === deliverables.length &&
        criteriaReady &&
        requiredEvidenceReady &&
        evidenceReady &&
        claim &&
        claim.deliverableIds.length > 0 &&
        claim.criterionResultIds.length > 0 &&
        claim.evidenceIds.length > 0
    )
  }

  function buildClaims(): CompletionContributorClaimDraft[] {
    const context = reportContext
    if (!context || !claimId || !actualRole.trim() || !actualOwnership || !contributionStatement.trim()) return []
    const ownClaim: NativeReportClaim = {
        id: claimId,
        contributorUserId: context.reportedBy,
        actualRole,
        actualOwnership,
        contributionStatement,
        deliverableIds: selectedDeliverableIds,
        criterionResultIds: Object.values(criterionDrafts)
          .filter((item) => item.result)
          .map((item) => item.id),
        evidenceIds: evidence.map((item) => item.id),
    }
    return mergeExistingContributorClaims(contributorClaims, ownClaim, context.reportedBy)
  }

  async function save(intent: 'draft' | 'submit') {
    error = ''
    success = ''
    const context = reportContext
    if (!usableBrief || !context || !taskSubmissionId) {
      error = t('task.submission_panel.native.errors.context_unavailable', 'The pinned assignment context is unavailable.')
      return
    }

    const payload = buildTaskCompletionReportPayload({
      context,
      // Each persisted revision has an immutable database identity. Reusing the
      // previous revision ID makes draft-then-submit collide on the primary key.
      reportId: newId(),
      expectedRevision,
      idempotencyKey: `completion-ui:${newId()}`,
      actualRole,
      actualOwnership,
      actualAutonomy,
      actualDeliverableIds: selectedDeliverableIds,
      workPerformed,
      contributionStatement,
      actualOutcomes,
      impactObserved,
      limitations,
      remainingWork,
      criterionResults: Object.fromEntries(
        Object.entries(criterionDrafts).map(([criterionId, draft]) => [
          criterionId,
          { ...draft, evidenceIds: evidenceIdsForCriterion(criterionId) },
        ])
      ),
      evidence,
      evidenceRequirements: evidenceRequirements.map((item) => ({
        id: item.id,
        criterionIds: item.criterionIds ?? [],
        deliverableIds: item.deliverableIds ?? [],
      })),
      contributorClaims: buildClaims(),
    })

    if (intent === 'draft') saving = true
    else submitting = true
    try {
      const response = await axios.post<Envelope<NativeReportValue>>(
        `/api/v1/task-assignments/${assignmentId}/completion-report${intent === 'submit' ? '/submit' : ''}`,
        payload
      )
      syncReport(response.data.data)
      success = intent === 'submit'
        ? t('task.submission_panel.native.success.submitted', 'Completion Report submitted.')
        : t('task.submission_panel.native.success.draft_saved', 'Draft saved.')
    } catch (cause) {
      error = errorMessage(
        cause,
        t('task.submission_panel.native.errors.save_failed', 'Unable to save the native Completion Report.')
      )
    } finally {
      if (intent === 'draft') saving = false
      else submitting = false
    }
  }

  async function load() {
    if (!usableBrief) {
      error = t(
        'task.submission_panel.native.errors.brief_unavailable',
        'This assignment brief is unavailable or incomplete. Refresh the task before reporting completion.'
      )
      loading = false
      return
    }

    try {
      let response = await axios.get<Envelope<NativeReportValue | null>>(
        `/api/v1/task-assignments/${assignmentId}/completion-report`
      )
      if (!response.data.data) {
        const startResponse = await axios.post<Envelope<StartValue>>(
          `/api/v1/task-assignments/${assignmentId}/completion-report/start`
        )
        started = startResponse.data.data
        taskSubmissionId = started.taskSubmissionId
        claimId = newId()
        selectedDeliverableIds = []
        resetCriterionDrafts()
        response = await axios.get<Envelope<NativeReportValue | null>>(
          `/api/v1/task-assignments/${assignmentId}/completion-report`
        )
      }
      if (response.data.data) syncReport(response.data.data)
      else if (!claimId) claimId = newId()
    } catch (cause) {
      error = errorMessage(
        cause,
        t('task.submission_panel.native.errors.load_failed', 'Unable to load the native Completion Report.')
      )
    } finally {
      loading = false
    }
  }

  onMount(() => {
    selectedDeliverableIds = []
    resetCriterionDrafts()
    contributorClaims = []
    claimId = newId()
    void load()
  })
</script>

<section class="space-y-5 rounded-lg border border-primary/20 bg-primary/5 p-4" aria-labelledby="native-completion-report-heading">
  <div class="flex flex-wrap items-start justify-between gap-3">
    <div>
      <h3 id="native-completion-report-heading" class="text-base font-semibold">
        {t('task.submission_panel.native.title', 'Structured completion report')}
      </h3>
      <p class="mt-1 text-sm text-muted-foreground">
        {t(
          'task.submission_panel.native.description',
          'This report is pinned to the assignment snapshot and keeps expected outcomes separate from actual results.'
        )}
      </p>
    </div>
    {#if report}
      <span class="rounded-full border px-2 py-1 text-xs font-medium">
        {report.status === 'submitted'
          ? t('task.submission_panel.native.status.submitted', 'Submitted')
          : t('task.submission_panel.native.status.draft_revision', `Draft · revision ${report.revision}`, {
              revision: report.revision,
            })}
      </span>
    {/if}
  </div>

  {#if loading}
    <p class="text-sm text-muted-foreground">
      {t('task.submission_panel.native.loading', 'Loading native Completion Report…')}
    </p>
  {:else if !usableBrief}
    <div class="rounded border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive" role="alert">
      {error || t(
        'task.submission_panel.native.errors.brief_unavailable',
        'This assignment brief is unavailable or incomplete. Refresh the task before reporting completion.'
      )}
    </div>
  {:else}
    {#if error}
      <div class="rounded border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive" role="alert">{error}</div>
    {/if}
    {#if success}
      <div class="rounded border border-primary/30 bg-primary/5 px-3 py-2 text-sm" role="status">{success}</div>
    {/if}

    <div class="grid gap-4 md:grid-cols-2">
      <label class="space-y-1 text-sm">
        <span class="font-medium">{t('task.submission_panel.native.work_performed', 'Work performed')}</span>
        <textarea class="min-h-28 w-full rounded border bg-background p-2" bind:value={workPerformed} disabled={!canEdit}></textarea>
      </label>
      <label class="space-y-1 text-sm">
        <span class="font-medium">{t('task.submission_panel.native.contribution_statement', 'Contribution statement')}</span>
        <textarea class="min-h-28 w-full rounded border bg-background p-2" bind:value={contributionStatement} disabled={!canEdit}></textarea>
      </label>
      <label class="space-y-1 text-sm">
        <span class="font-medium">{t('task.submission_panel.native.actual_role', 'Actual role')}</span>
        <input class="w-full rounded border bg-background p-2" bind:value={actualRole} disabled={!canEdit} />
      </label>
      <label class="space-y-1 text-sm">
        <span class="font-medium">{t('task.submission_panel.native.actual_ownership', 'Actual ownership')}</span>
        <select class="w-full rounded border bg-background p-2" aria-label={t('task.submission_panel.native.actual_ownership', 'Actual ownership')} bind:value={actualOwnership} disabled={!canEdit}>
          <option value={null}>{t('task.submission_panel.native.ownership.select', 'Select ownership')}</option>
          <option value="contributor">{t('task.submission_panel.native.ownership.contributor', 'Contributor')}</option>
          <option value="shared_owner">{t('task.submission_panel.native.ownership.shared_owner', 'Shared owner')}</option>
          <option value="primary_owner">{t('task.submission_panel.native.ownership.primary_owner', 'Primary owner')}</option>
          <option value="lead">{t('task.submission_panel.native.ownership.lead', 'Lead')}</option>
        </select>
      </label>
      <label class="space-y-1 text-sm">
        <span class="font-medium">{t('task.submission_panel.native.actual_autonomy', 'Actual autonomy')}</span>
        <select class="w-full rounded border bg-background p-2" aria-label={t('task.submission_panel.native.actual_autonomy', 'Actual autonomy')} bind:value={actualAutonomy} disabled={!canEdit}>
          <option value={null}>{t('task.submission_panel.native.autonomy.not_specified', 'Not specified')}</option>
          <option value="guided">{t('task.submission_panel.native.autonomy.guided', 'Guided')}</option>
          <option value="supervised">{t('task.submission_panel.native.autonomy.supervised', 'Supervised')}</option>
          <option value="independent">{t('task.submission_panel.native.autonomy.independent', 'Independent')}</option>
          <option value="leads_others">{t('task.submission_panel.native.autonomy.leads_others', 'Leads others')}</option>
        </select>
      </label>
      <label class="space-y-1 text-sm">
        <span class="font-medium">{t('task.submission_panel.native.actual_outcomes', 'Actual outcomes')}</span>
        <textarea class="min-h-24 w-full rounded border bg-background p-2" bind:value={actualOutcomes} disabled={!canEdit}></textarea>
      </label>
      <label class="space-y-1 text-sm">
        <span class="font-medium">{t('task.submission_panel.native.impact_observed', 'Impact observed')}</span>
        <textarea class="min-h-24 w-full rounded border bg-background p-2" bind:value={impactObserved} disabled={!canEdit}></textarea>
      </label>
      <label class="space-y-1 text-sm">
        <span class="font-medium">{t('task.submission_panel.native.limitations', 'Limitations')}</span>
        <textarea class="min-h-20 w-full rounded border bg-background p-2" bind:value={limitations} disabled={!canEdit}></textarea>
      </label>
      <label class="space-y-1 text-sm">
        <span class="font-medium">{t('task.submission_panel.native.remaining_work', 'Remaining work')}</span>
        <textarea class="min-h-20 w-full rounded border bg-background p-2" bind:value={remainingWork} disabled={!canEdit}></textarea>
      </label>
    </div>

    <section class="space-y-3 rounded border bg-background/70 p-3" aria-labelledby="native-deliverables-heading">
      <h4 id="native-deliverables-heading" class="font-medium">
        {t('task.submission_panel.native.deliverables.title', 'Deliverables')}
      </h4>
      {#if deliverables.length === 0}
        <p class="text-sm text-muted-foreground">
          {t('task.submission_panel.native.deliverables.none', 'No deliverables are pinned to this assignment.')}
        </p>
      {:else}
        <div>
          <p class="text-xs text-muted-foreground">
            {t('task.submission_panel.native.deliverables.expected', 'Expected deliverables from the pinned contract')}
          </p>
          <ul class="mt-1 list-disc space-y-1 pl-5 text-sm">
            {#each deliverables as deliverable}<li>{deliverable.title}</li>{/each}
          </ul>
        </div>
        <p class="text-xs text-muted-foreground">
          {t('task.submission_panel.native.deliverables.select_actual', 'Select the deliverables you actually completed.')}
        </p>
        <div class="grid gap-2 sm:grid-cols-2">
          {#each deliverables as deliverable}
            <label class="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={selectedDeliverableIds.includes(deliverable.id)}
                disabled={!canEdit}
                onchange={() => {
                  selectedDeliverableIds = selectedDeliverableIds.includes(deliverable.id)
                    ? selectedDeliverableIds.filter((id) => id !== deliverable.id)
                    : [...selectedDeliverableIds, deliverable.id]
                }}
              />
              <span>{deliverable.title}</span>
            </label>
          {/each}
        </div>
      {/if}
    </section>

    <section class="space-y-4" aria-labelledby="native-criteria-heading">
      <div>
        <h4 id="native-criteria-heading" class="font-medium">
          {t('task.submission_panel.native.criteria.title', 'Criterion results')}
        </h4>
        <p class="text-xs text-muted-foreground">
          {t('task.submission_panel.native.criteria.expected_read_only', 'Expected outcome is read-only from the pinned contract.')}
        </p>
      </div>
      {#each criteria as criterion}
        {@const draft = criterionDrafts[criterion.id]}
        <article class="space-y-3 rounded border bg-background/70 p-3">
          <p class="text-sm font-medium">
            {t('task.submission_panel.native.criteria.expected_outcome', 'Expected outcome')}: {criterion.statement}
          </p>
          <div class="grid gap-3 md:grid-cols-3">
            <label class="space-y-1 text-sm md:col-span-2">
              <span>{t('task.submission_panel.native.criteria.actual_outcome', 'Actual outcome')}</span>
              <textarea
                class="min-h-20 w-full rounded border bg-background p-2"
                value={draft?.actualOutcome ?? ''}
                disabled={!canEdit}
                oninput={(event) => setCriterionField(criterion.id, 'actualOutcome', event.currentTarget.value)}
              ></textarea>
            </label>
            <label class="space-y-1 text-sm">
              <span>{t('task.submission_panel.native.criteria.result', 'Result')}</span>
              <select
                class="w-full rounded border bg-background p-2"
                value={draft?.result ?? ''}
                disabled={!canEdit}
                onchange={(event) => setCriterionField(criterion.id, 'result', event.currentTarget.value)}
              >
                <option value="">{t('task.submission_panel.native.criteria.select_result', 'Select result')}</option>
                <option value="met">{t('task.submission_panel.native.criteria.results.met', 'Met')}</option>
                <option value="partially_met">{t('task.submission_panel.native.criteria.results.partially_met', 'Partially met')}</option>
                <option value="not_met">{t('task.submission_panel.native.criteria.results.not_met', 'Not met')}</option>
                <option value="not_applicable">{t('task.submission_panel.native.criteria.results.not_applicable', 'Not applicable')}</option>
              </select>
            </label>
          </div>
          <label class="block space-y-1 text-sm">
            <span>{t('task.submission_panel.native.criteria.explanation', 'Explanation')}</span>
            <textarea
              class="min-h-20 w-full rounded border bg-background p-2"
              value={draft?.explanation ?? ''}
              disabled={!canEdit}
              oninput={(event) => setCriterionField(criterion.id, 'explanation', event.currentTarget.value)}
            ></textarea>
          </label>
          <label class="block space-y-1 text-sm">
            <span>{t('task.submission_panel.native.criteria.deviation_status', 'Deviation status')}</span>
            <select
              class="w-full rounded border bg-background p-2"
              value={draft?.deviationStatus ?? 'none'}
              disabled={!canEdit}
              onchange={(event) => setCriterionField(criterion.id, 'deviationStatus', event.currentTarget.value)}
            >
              <option value="none">{t('task.submission_panel.native.criteria.deviation.none', 'No deviation')}</option>
              <option value="reported">{t('task.submission_panel.native.criteria.deviation.reported', 'Reported deviation')}</option>
              <option value="approved">{t('task.submission_panel.native.criteria.deviation.approved', 'Approved deviation')}</option>
              <option value="governed_exception">{t('task.submission_panel.native.criteria.deviation.governed_exception', 'Governed exception')}</option>
            </select>
          </label>
          {#if draft?.deviationStatus && draft.deviationStatus !== 'none'}
            <div class="grid gap-3 md:grid-cols-2">
              <label class="space-y-1 text-sm">
                <span>{t('task.submission_panel.native.criteria.deviation_summary', 'Deviation summary')}</span>
                <input
                  class="w-full rounded border bg-background p-2"
                  value={draft.deviationSummary ?? ''}
                  disabled={!canEdit}
                  oninput={(event) => setCriterionField(criterion.id, 'deviationSummary', event.currentTarget.value)}
                />
              </label>
              {#if draft.deviationStatus === 'approved' || draft.deviationStatus === 'governed_exception'}
                <label class="space-y-1 text-sm">
                  <span>{t('task.submission_panel.native.criteria.deviation_approval_ref', 'Deviation approval reference')}</span>
                  <input
                    class="w-full rounded border bg-background p-2"
                    value={draft.deviationApprovalRef ?? ''}
                    disabled={!canEdit}
                    oninput={(event) => setCriterionField(criterion.id, 'deviationApprovalRef', event.currentTarget.value)}
                  />
                </label>
              {/if}
            </div>
          {/if}
          {#if draft?.result === 'not_applicable'}
            <div class="grid gap-3 md:grid-cols-2">
              <label class="space-y-1 text-sm">
                <span>{t('task.submission_panel.native.criteria.not_applicable_reason', 'Not-applicable reason')}</span>
                <input
                  class="w-full rounded border bg-background p-2"
                  value={draft.notApplicableReason ?? ''}
                  disabled={!canEdit}
                  oninput={(event) => setCriterionField(criterion.id, 'notApplicableReason', event.currentTarget.value)}
                />
              </label>
              <label class="space-y-1 text-sm">
                <span>{t('task.submission_panel.native.criteria.not_applicable_policy_ref', 'Not-applicable policy reference')}</span>
                <input
                  class="w-full rounded border bg-background p-2"
                  value={draft.notApplicablePolicyRef ?? ''}
                  disabled={!canEdit}
                  oninput={(event) => setCriterionField(criterion.id, 'notApplicablePolicyRef', event.currentTarget.value)}
                />
              </label>
            </div>
          {/if}
          <p class="text-xs text-muted-foreground">
            {t('task.submission_panel.native.criteria.evidence_mapped', 'Evidence mapped to this criterion')}: {evidenceIdsForCriterion(criterion.id).length}
          </p>
        </article>
      {/each}
    </section>

    <section class="space-y-3 rounded border bg-background/70 p-3" aria-labelledby="native-evidence-heading">
      <div>
        <h4 id="native-evidence-heading" class="font-medium">
          {t('task.submission_panel.native.evidence.title', 'Evidence mapping')}
        </h4>
        <p class="text-xs text-muted-foreground">
          {t('task.submission_panel.native.evidence.description', 'Every evidence item must point to pinned requirement, criterion, and deliverable IDs.')}
        </p>
      </div>
      {#if canEdit}
        <div class="grid gap-2 md:grid-cols-2">
          <input class="rounded border bg-background p-2 text-sm" aria-label={t('task.submission_panel.native.evidence.title_label', 'Evidence title')} placeholder={t('task.submission_panel.native.evidence.title_label', 'Evidence title')} bind:value={evidenceTitle} />
          <input class="rounded border bg-background p-2 text-sm" aria-label={t('task.submission_panel.native.evidence.url_label', 'Evidence URL')} placeholder="https://…" bind:value={evidenceUri} />
          <input class="rounded border bg-background p-2 text-sm" aria-label={t('task.submission_panel.native.evidence.type_label', 'Evidence type')} placeholder={t('task.submission_panel.native.evidence.type_label', 'Evidence type')} bind:value={evidenceType} />
          <input class="rounded border bg-background p-2 text-sm" aria-label={t('task.submission_panel.native.evidence.description_label', 'Evidence description')} placeholder={t('task.submission_panel.native.evidence.description_placeholder', 'Description')} bind:value={evidenceDescription} />
          <select class="rounded border bg-background p-2 text-sm" aria-label={t('task.submission_panel.native.evidence.requirement_label', 'Evidence requirement')} bind:value={evidenceRequirementId}>
            <option value="">{t('task.submission_panel.native.evidence.select_requirement', 'Select requirement')}</option>
            {#each evidenceRequirements as requirement}<option value={requirement.id}>{requirement.title}</option>{/each}
          </select>
          <select class="rounded border bg-background p-2 text-sm" aria-label={t('task.submission_panel.native.evidence.criterion_label', 'Evidence criterion')} bind:value={evidenceCriterionId}>
            <option value="">{t('task.submission_panel.native.evidence.select_criterion', 'Select criterion')}</option>
            {#each criteria as criterion}<option value={criterion.id}>{criterion.statement}</option>{/each}
          </select>
          <select class="rounded border bg-background p-2 text-sm" aria-label={t('task.submission_panel.native.evidence.deliverable_label', 'Evidence deliverable')} bind:value={evidenceDeliverableId}>
            <option value="">{t('task.submission_panel.native.evidence.select_deliverable', 'Select deliverable')}</option>
            {#each deliverables as deliverable}<option value={deliverable.id}>{deliverable.title}</option>{/each}
          </select>
          <select class="rounded border bg-background p-2 text-sm" aria-label={t('task.submission_panel.native.evidence.access_label', 'Reviewer access state')} bind:value={evidenceAccess}>
            <option value="unknown">{t('task.submission_panel.native.evidence.access.unknown', 'Reviewer access unknown')}</option>
            <option value="available">{t('task.submission_panel.native.evidence.access.available', 'Reviewer can access')}</option>
            <option value="restricted">{t('task.submission_panel.native.evidence.access.restricted', 'Reviewer access restricted')}</option>
            <option value="unavailable">{t('task.submission_panel.native.evidence.access.unavailable', 'Reviewer access unavailable')}</option>
          </select>
          <select class="rounded border bg-background p-2 text-sm" aria-label={t('task.submission_panel.native.evidence.availability_label', 'Evidence availability')} bind:value={evidenceAvailability}>
            <option value="not_disclosed">{t('task.submission_panel.native.evidence.availability.not_disclosed', 'Not disclosed')}</option>
            <option value="available">{t('task.submission_panel.native.evidence.availability.available', 'Available')}</option>
            <option value="partially_available">{t('task.submission_panel.native.evidence.availability.partially_available', 'Partially available')}</option>
            <option value="unavailable">{t('task.submission_panel.native.evidence.availability.unavailable', 'Unavailable')}</option>
          </select>
          <select class="rounded border bg-background p-2 text-sm" aria-label={t('task.submission_panel.native.evidence.privacy_label', 'Evidence privacy')} bind:value={evidencePrivacy}>
            <option value="internal">{t('task.submission_panel.native.evidence.privacy.internal', 'Internal')}</option>
            <option value="private">{t('task.submission_panel.native.evidence.privacy.private', 'Private')}</option>
            <option value="confidential">{t('task.submission_panel.native.evidence.privacy.confidential', 'Confidential')}</option>
            <option value="redacted">{t('task.submission_panel.native.evidence.privacy.redacted', 'Redacted')}</option>
            <option value="public_safe">{t('task.submission_panel.native.evidence.privacy.public_safe', 'Public safe')}</option>
          </select>
        </div>
        <button type="button" class="rounded border px-3 py-2 text-sm" onclick={addEvidence}>
          {t('task.submission_panel.native.evidence.add', 'Add evidence')}
        </button>
      {/if}
      {#if evidence.length > 0}
        <ul class="space-y-2">
          {#each evidence as item}
            <li class="flex items-start justify-between gap-3 rounded border p-2 text-sm">
              <span><strong>{item.title}</strong> · {item.uri ?? item.storageReference ?? t('task.submission_panel.native.evidence.no_locator', 'No locator')} · {t(`task.submission_panel.native.evidence.privacy.${item.privacyClassification}`, item.privacyClassification)}</span>
              {#if canEdit}<button type="button" class="text-destructive" onclick={() => removeEvidence(item.id)}>{t('task.submission_panel.native.evidence.remove', 'Remove')}</button>{/if}
            </li>
          {/each}
        </ul>
      {:else}
        <p class="text-sm text-muted-foreground">
          {t('task.submission_panel.native.evidence.none', 'No evidence mapped yet.')}
        </p>
      {/if}
    </section>

    {#if canEdit}
      <div class="flex flex-wrap gap-2">
        <button type="button" class="rounded border px-3 py-2 text-sm" disabled={saving || submitting} onclick={() => void save('draft')}>
          {saving ? t('task.submission_panel.native.actions.saving', 'Saving…') : t('task.submission_panel.native.actions.save_draft', 'Save draft')}
        </button>
        <button type="button" class="rounded bg-primary px-3 py-2 text-sm text-primary-foreground" disabled={saving || submitting || !canSubmitNative()} onclick={() => void save('submit')}>
          {submitting ? t('task.submission_panel.native.actions.submitting', 'Submitting…') : t('task.submission_panel.native.actions.submit', 'Submit for review')}
        </button>
      </div>
      {#if !canSubmitNative()}
        <p class="text-xs text-muted-foreground">
          {t('task.submission_panel.native.actions.submit_requirements', 'Complete the actual role, ownership, outcomes, criteria, evidence, and acknowledgement requirements before submitting.')}
        </p>
      {/if}
    {/if}
  {/if}
</section>
