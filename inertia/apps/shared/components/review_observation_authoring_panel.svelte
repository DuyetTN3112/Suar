<script lang="ts">
  import { router } from '@inertiajs/svelte'
  import type { TaskCompletionReviewPackageProjection } from '@/apps/shared/reviews/task_completion_review_package'

  type Claim = Record<string, unknown> & { id: string }
  type Evidence = Record<string, unknown> & { id: string }
  type AuthoringContext = {
    reviewSessionId: string
    taskAssignmentId: string
    assignmentSnapshotId: string
    assignmentSnapshotHash: string
    completionReportId: string
    completionReportHash: string
    taskContractVersionId: string
    taskContractHash: string
    subjectUserId: string
    report?: Record<string, unknown>
    claims?: Claim[]
    evidence?: Evidence[]
    reviewPackage?: TaskCompletionReviewPackageProjection
    reviewerTypes?: Array<{ reviewer_id: string; reviewer_type: string }>
    observations?: Array<{
      id: string
      disposition: string
      rationale: string
      governance_state: string
      reviewer_type: string
      evidence_sufficiency: string
    }>
  }

  type Translate = (
    key: string,
    params?: Record<string, unknown>,
    fallback?: string
  ) => string

  interface Props {
    workflowId: string
    currentUserId: string | null
    taskId: string
    projectId: string | null
    taskDetailUrl: string
    context?: AuthoringContext | null
    translate?: Translate
  }

  const {
    workflowId,
    currentUserId,
    taskId,
    projectId,
    taskDetailUrl,
    context,
    translate,
  }: Props = $props()

  function t(key: string, fallback: string, params: Record<string, unknown> = {}): string {
    return translate?.(key, params, fallback) ?? fallback
  }

  let claimId = $state('')
  let disposition = $state<'confirm' | 'narrow' | 'partially_verify' | 'reject'>('confirm')
  let rationale = $state('')
  let evidenceSufficiency = $state<'pending' | 'adequate' | 'governed_exception' | 'inadequate'>('adequate')
  let error = $state('')
  let submitted = $state(false)

  const claims = $derived(context?.claims ?? [])
  const evidence = $derived(context?.evidence ?? [])
  const selectedClaim = $derived(claims.find((claim) => claim.id === claimId) ?? null)
  const selectedClaimEvidenceIds = $derived(
    new Set(stringArray(selectedClaim?.evidence_refs))
  )
  const availableEvidence = $derived(
    evidence.filter(
      (item) =>
        item.reviewer_access_state === 'available' && selectedClaimEvidenceIds.has(item.id)
    )
  )
  const observations = $derived(context?.observations ?? [])
  const attributedClaims = $derived(
    claims.filter(
      (claim) =>
        typeof claim.contributorUserId === 'string' && claim.contributorUserId.trim().length > 0
    )
  )
  const reviewerType = $derived(
    context?.reviewerTypes?.find((item) => item.reviewer_id === currentUserId)?.reviewer_type ?? 'human'
  )
  const canSubmit = $derived(
    Boolean(
      workflowId &&
        currentUserId &&
        context &&
        selectedClaim &&
        rationale.trim() &&
        availableEvidence.length > 0
    )
  )

  function display(value: unknown): string {
    return typeof value === 'string' && value.trim() ? value : '—'
  }

  function stringArray(value: unknown): string[] {
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
  }

  function recordValue(value: unknown, key: string): unknown {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null
    return (value as Record<string, unknown>)[key]
  }

  function claimValue(claim: Claim, camelCaseKey: string, snakeCaseKey: string): unknown {
    return claim[camelCaseKey] ?? claim[snakeCaseKey]
  }

  function reviewBoardUrl(): string {
    return projectId
      ? `/projects/${encodeURIComponent(projectId)}/reviews/tasks?task_id=${encodeURIComponent(taskId)}`
      : taskDetailUrl
  }

  function submitObservation() {
    if (!canSubmit || !context || !selectedClaim || !currentUserId) return
    error = ''
    const now = new Date().toISOString()
    const evidenceRefs = availableEvidence.map((item) => item.id)
    const observation = {
      schemaVersion: 'suar.review_observation.v1',
      id: crypto.randomUUID(),
      reviewWorkflowId: workflowId,
      reviewSessionId: context.reviewSessionId,
      reviewRevision: 1,
      reviewPolicyVersion: 'task-review.v1',
      capabilityTaxonomyVersion: null,
      assignmentSnapshotId: context.assignmentSnapshotId,
      sourceSnapshotHash: context.assignmentSnapshotHash,
      taskAssignmentId: context.taskAssignmentId,
      subjectUserId: context.subjectUserId,
      observationType: 'accomplishment_claim',
      targetRef: selectedClaim.id,
      disposition,
      structuredValue: {
        action: display(selectedClaim.action),
        object: display(selectedClaim.object),
        actualOwnership: display(selectedClaim.actual_ownership),
        deliverableRefs: stringArray(selectedClaim.deliverable_refs),
        criterionResultRefs: stringArray(selectedClaim.criterion_result_refs),
        evidenceRefs,
      },
      rationale: rationale.trim(),
      evidenceRefs,
      reviewerId: currentUserId,
      reviewerType,
      confidence: null,
      assessmentCeiling: null,
      governanceState: 'final',
      supersedesObservationId: null,
      createdAt: now,
      finalizedAt: now,
    }
    router.post(`/reviews/${workflowId}/observations`, {
      idempotencyKey: crypto.randomUUID(),
      completionReportId: context.completionReportId,
      completionClaimId: selectedClaim.id,
      observation,
      evidenceSufficiency,
      rationaleClassification: 'internal',
      evidenceRelations: evidenceRefs.map((evidenceId) => ({ evidenceId, relation: 'supports' })),
      project_id: projectId ?? '',
      task_id: taskId,
      redirect_to: reviewBoardUrl(),
    }, {
      preserveScroll: true,
      preserveState: true,
      onSuccess: () => {
        submitted = true
      },
      onFinish: () => {
        if (!error) submitted = true
        if (projectId) {
          router.get(reviewBoardUrl(), {}, { preserveScroll: true, preserveState: false })
        }
      },
      onError: (errors: Record<string, string | string[] | undefined>) => {
        const value = errors.message ?? errors.observation ?? Object.values(errors)[0]
        error = Array.isArray(value)
          ? value[0] ?? t('task.review_observation.errors.rejected', 'Observation was rejected.')
          : value ?? t('task.review_observation.errors.rejected', 'Observation was rejected.')
      },
    })
  }
</script>

{#if context && claims.length > 0}
  <section class="space-y-3 border-t border-border pt-4" data-testid="review-observation-authoring">
    <div>
      <h4 class="text-sm font-black uppercase tracking-[0.14em] text-muted-foreground">
        {t('task.review_observation.title', 'Verify completion claim')}
      </h4>
      <p class="mt-1 text-xs text-muted-foreground">
        {t(
          'task.review_observation.pinned_snapshot',
          'Server-pinned snapshot: {snapshotId} · {snapshotHash}',
          { snapshotId: context.assignmentSnapshotId, snapshotHash: context.assignmentSnapshotHash }
        )}
      </p>
    </div>

    {#if observations.length > 0}
      <div class="rounded-md border border-emerald-300/60 bg-emerald-50/50 px-3 py-2 text-sm" data-testid="review-observation-history">
        <p class="font-bold">{t('task.review_observation.history_title', 'Governed observations')}</p>
        {#each observations as observation (observation.id)}
          <div class="mt-2 border-t border-emerald-300/40 pt-2">
            <p class="font-semibold">{observation.disposition} · {observation.governance_state}</p>
            <p class="mt-1">{observation.rationale}</p>
            <p class="mt-1 text-xs text-muted-foreground">
              {t(
                'task.review_observation.history_meta',
                '{reviewerType} · evidence: {evidenceSufficiency}',
                { reviewerType: observation.reviewer_type, evidenceSufficiency: observation.evidence_sufficiency }
              )}
            </p>
          </div>
        {/each}
      </div>
    {/if}

    {#if context.report}
      <div class="rounded-md border border-border bg-background px-3 py-2 text-sm">
        <p class="font-bold">{t('task.review_observation.report_title', 'Completion report')}</p>
        <p class="mt-1 whitespace-pre-wrap">{display(context.report.workPerformed)}</p>
        <p class="mt-1 text-xs text-muted-foreground">
          {t(
            'task.review_observation.report_meta',
            '{privacyClassification} · not public or verified yet',
            { privacyClassification: display(context.report.privacyClassification) }
          )}
        </p>
      </div>
    {/if}

    {#if context.reviewPackage}
      <div class="space-y-2 rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-sm" data-testid="review-package-facts">
        <p class="font-bold">{t('task.review_observation.package_facts_title', 'Native review package')}</p>
        <p class="text-xs text-muted-foreground">
          {t(
            'task.review_observation.package_revision',
            'Report revision {revision} · package {packageHash}',
            { revision: context.reviewPackage.reportRevision, packageHash: context.reviewPackage.packageHash }
          )}
        </p>
        <p>
          <span class="font-semibold">{t('task.review_observation.assignment_contract', 'Assignment contract')}:</span>
          {display(recordValue(recordValue(context.reviewPackage.assignmentContract.snapshot, 'resolvedContract'), 'title'))}
          · {display(context.reviewPackage.assignmentContract.snapshot.snapshotHash)}
        </p>
        <div>
          <p class="font-semibold">{t('task.review_observation.criteria_title', 'Criterion results')}</p>
          <ul class="mt-1 space-y-1 text-xs">
            {#each context.reviewPackage.criterionResults as criterion (String(criterion.id))}
              <li>
                {display(criterion.criterionId)} · {display(criterion.expectedOutcome)} → {display(criterion.actualOutcome)} · {display(criterion.result)}
              </li>
            {:else}
              <li>{t('task.review_observation.criteria_empty', 'No criterion results recorded.')}</li>
            {/each}
          </ul>
        </div>
        <p class="text-xs text-muted-foreground">
          {t(
            'task.review_observation.evidence_manifest',
            'Evidence manifest: {count} item(s); reviewer-accessible items are eligible for observation.',
            { count: context.reviewPackage.evidenceManifest.length }
          )}
        </p>
      </div>
    {/if}

    {#if attributedClaims.length > 0}
      <section class="space-y-2 rounded-md border border-border bg-background px-3 py-2 text-sm" data-testid="review-package-attribution">
        <div>
          <p class="font-bold">{t('task.review_observation.attribution_title', 'Contribution attribution (read-only)')}</p>
          <p class="mt-1 text-xs text-muted-foreground">
            {t('task.review_observation.attribution_note', 'Existing attribution is shown for review only; no edit controls are available.')}
          </p>
        </div>
        <ul class="space-y-2 text-xs">
          {#each attributedClaims as claim (claim.id)}
            <li class="rounded border border-border/70 px-2 py-1.5">
              <p class="font-semibold">{display(claim.proposed_title ?? claim.proposedTitle)}</p>
              <p class="mt-1">
                <span class="font-semibold">{t('task.review_observation.attribution_contributor', 'Contributor reference')}:</span>
                {display(claim.contributorUserId)}
              </p>
              <p class="mt-1 text-muted-foreground">
                <span class="font-semibold">{t('task.review_observation.attribution_role', 'Role')}:</span>
                {display(claimValue(claim, 'actualRole', 'actual_role'))}
                ·
                <span class="font-semibold">{t('task.review_observation.attribution_ownership', 'Ownership')}:</span>
                {display(claimValue(claim, 'actualOwnership', 'actual_ownership'))}
              </p>
              <p class="mt-1 text-muted-foreground">
                <span class="font-semibold">{t('task.review_observation.attribution_autonomy', 'Autonomy')}:</span>
                {display(claimValue(claim, 'actualAutonomy', 'actual_autonomy'))}
                ·
                <span class="font-semibold">{t('task.review_observation.attribution_status', 'Status')}:</span>
                {display(claimValue(claim, 'claimStatus', 'claim_status'))}
              </p>
              <p class="mt-1 text-muted-foreground">
                <span class="font-semibold">{t('task.review_observation.attribution_statement', 'Contribution')}:</span>
                {display(claimValue(claim, 'contributionStatement', 'contribution_statement'))}
              </p>
              <p class="mt-1 text-muted-foreground">
                <span class="font-semibold">{t('task.review_observation.attribution_evidence', 'Evidence refs')}:</span>
                {stringArray(claim.evidenceRefs ?? claim.evidence_refs).join(', ') || '—'}
              </p>
            </li>
          {/each}
        </ul>
      </section>
    {/if}

    <label class="block text-sm font-bold" for="review-observation-claim">
      {t('task.review_observation.claim_label', 'Claim')}
    </label>
    <select id="review-observation-claim" bind:value={claimId} class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
      <option value="">{t('task.review_observation.claim_placeholder', 'Select a claim')}</option>
      {#each claims as claim (claim.id)}
        <option value={claim.id}>{display(claim.proposed_title)} · {display(claim.claim_status)}</option>
      {/each}
    </select>

    {#if selectedClaim}
      <div class="rounded-md border border-border bg-background px-3 py-2 text-sm">
        <p>{display(selectedClaim.proposed_statement)}</p>
        <p class="mt-1 text-xs text-muted-foreground">Ownership ceiling: {display(selectedClaim.actual_ownership)} · privacy: {display(selectedClaim.privacy_classification)}</p>
      </div>
    {/if}

    <div class="grid gap-3 sm:grid-cols-2">
      <label class="text-sm font-bold">{t('task.review_observation.disposition_label', 'Disposition')}
        <select bind:value={disposition} class="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 font-normal">
          <option value="confirm">{t('task.review_observation.disposition.confirm', 'Confirm')}</option>
          <option value="narrow">{t('task.review_observation.disposition.narrow', 'Narrow')}</option>
          <option value="partially_verify">{t('task.review_observation.disposition.partially_verify', 'Partially verify')}</option>
          <option value="reject">{t('task.review_observation.disposition.reject', 'Reject')}</option>
        </select>
      </label>
      <label class="text-sm font-bold">{t('task.review_observation.evidence_sufficiency_label', 'Evidence sufficiency')}
        <select bind:value={evidenceSufficiency} class="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 font-normal">
          <option value="adequate">{t('task.review_observation.evidence_sufficiency.adequate', 'Adequate')}</option>
          <option value="pending">{t('task.review_observation.evidence_sufficiency.pending', 'Pending')}</option>
          <option value="governed_exception">{t('task.review_observation.evidence_sufficiency.governed_exception', 'Governed exception')}</option>
          <option value="inadequate">{t('task.review_observation.evidence_sufficiency.inadequate', 'Inadequate')}</option>
        </select>
      </label>
    </div>

    <p class="text-xs text-muted-foreground">
      {t(
        'task.review_observation.evidence_count',
        'Claim-linked evidence available: {available}/{total}. Restricted or unrelated evidence cannot be finalized.',
        { available: availableEvidence.length, total: evidence.length }
      )}
    </p>
    <label class="block text-sm font-bold" for="review-observation-rationale">
      {t('task.review_observation.rationale_label', 'Rationale')}
    </label>
    <textarea
      id="review-observation-rationale"
      bind:value={rationale}
      class="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
      placeholder={t('task.review_observation.rationale_placeholder', 'Explain the exact scope verified, narrowed, or rejected.')}
    ></textarea>
    {#if error}<p role="alert" class="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">{error}</p>{/if}
    <button type="button" disabled={!canSubmit} class="rounded-md bg-primary px-3 py-2 text-sm font-bold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50" onclick={submitObservation}>
      {t('task.review_observation.submit', 'Submit observation')}
    </button>
    {#if submitted}<p role="status" class="text-sm font-semibold text-emerald-700">{t('task.review_observation.submitted', 'Observation submitted and governed.')}</p>{/if}
  </section>
{:else if currentUserId}
  <section class="border-t border-border pt-4 text-sm text-muted-foreground">
    {t('task.review_observation.unavailable', 'Review evidence is unavailable until a pinned completion report and claim exist.')}
  </section>
{/if}
