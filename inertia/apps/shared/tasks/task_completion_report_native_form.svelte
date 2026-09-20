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
    type CompletionReportPayloadContext,
  } from './task_completion_report_payload'
  import CompletionReportCriteriaSection from './components/completion_report_criteria_section.svelte'
  import CompletionReportDeliverablesSection from './components/completion_report_deliverables_section.svelte'
  import CompletionReportEvidenceSection from './components/completion_report_evidence_section.svelte'
  import CompletionReportOverviewSection from './components/completion_report_overview_section.svelte'
  import type {
    Envelope,
    NativeCompletionReportProps,
    NativeReportClaim,
    NativeReportField,
    NativeReportValue,
    StartValue,
  } from './task_completion_report_native_form.types.js'

  const props: NativeCompletionReportProps = $props()

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
      } else {
        const existingDraft = criterionDrafts[criterion.id]
        if (existingDraft) {
          nextCriteria[criterion.id] = existingDraft
        }
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

  function setCriterionField(criterionId: string, field: NativeReportField, value: string) {
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



  function addEvidence(item: CompletionEvidenceDraft) {
    evidence = [...evidence, item]
  }

  function handleEvidenceError(msg: string) {
    error = msg
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

    <CompletionReportOverviewSection
      bind:workPerformed
      bind:contributionStatement
      bind:actualRole
      bind:actualOwnership
      bind:actualAutonomy
      bind:actualOutcomes
      bind:impactObserved
      bind:limitations
      bind:remainingWork
      {canEdit}
      {t}
    />

    <CompletionReportDeliverablesSection
      {deliverables}
      bind:selectedDeliverableIds
      {canEdit}
      {t}
    />

    <CompletionReportCriteriaSection
      {criteria}
      {criterionDrafts}
      {canEdit}
      {t}
      onSetCriterionField={setCriterionField}
      {evidenceIdsForCriterion}
    />

    <CompletionReportEvidenceSection
      {canEdit}
      {evidence}
      {evidenceRequirements}
      {criteria}
      {deliverables}
      reportedBy={reportContext?.reportedBy}
      assigneeId={props.assigneeId}
      {t}
      onAddEvidence={addEvidence}
      onRemoveEvidence={removeEvidence}
      onError={handleEvidenceError}
    />

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
