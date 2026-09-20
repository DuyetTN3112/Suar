<script lang="ts">
  import type {
    NativeCriterion,
    NativeDeliverable,
    NativeEvidenceRequirement,
  } from '../task_completion_report_native_form.types.js'
  import type {
    CompletionEvidenceDraft,
    CompletionPrivacy,
  } from '../task_completion_report_payload.js'

  interface Props {
    canEdit: boolean
    evidence: CompletionEvidenceDraft[]
    evidenceRequirements: readonly NativeEvidenceRequirement[]
    criteria: readonly NativeCriterion[]
    deliverables: readonly NativeDeliverable[]
    reportedBy?: string | null
    assigneeId?: string | null
    t: (key: string, fallback: string, params?: Record<string, unknown>) => string
    onAddEvidence: (item: CompletionEvidenceDraft) => void
    onRemoveEvidence: (id: string) => void
    onError: (msg: string) => void
  }

  let {
    canEdit,
    evidence,
    evidenceRequirements,
    criteria,
    deliverables,
    reportedBy,
    assigneeId,
    t,
    onAddEvidence,
    onRemoveEvidence,
    onError,
  }: Props = $props()

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

  function newId(): string {
    return globalThis.crypto?.randomUUID?.() ?? `tva-${Date.now()}-${Math.random().toString(16).slice(2)}`
  }

  function handleAdd() {
    if (!evidenceTitle.trim() || !evidenceUri.trim()) {
      onError(t('task.submission_panel.native.errors.evidence_required', 'Evidence title and URL are required.'))
      return
    }
    if (!evidenceRequirementId || !evidenceCriterionId || !evidenceDeliverableId) {
      onError(
        t(
          'task.submission_panel.native.errors.evidence_mapping_required',
          'Map each evidence item to a requirement, criterion, and deliverable.'
        )
      )
      return
    }
    const ownerId = reportedBy ?? assigneeId ?? null
    const contributorId = reportedBy ?? assigneeId ?? ''
    onAddEvidence({
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
      ownerUserId: ownerId,
      contributorUserIds: [contributorId],
      reviewerAccessState: evidenceAccess,
      availability: evidenceAvailability,
      privacyClassification: evidencePrivacy,
    })
    evidenceTitle = ''
    evidenceUri = ''
    evidenceDescription = ''
  }
</script>

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
    <button type="button" class="rounded border px-3 py-2 text-sm" onclick={handleAdd}>
      {t('task.submission_panel.native.evidence.add', 'Add evidence')}
    </button>
  {/if}
  {#if evidence.length > 0}
    <ul class="space-y-2">
      {#each evidence as item}
        <li class="flex items-start justify-between gap-3 rounded border p-2 text-sm">
          <span><strong>{item.title}</strong> · {item.uri ?? item.storageReference ?? t('task.submission_panel.native.evidence.no_locator', 'No locator')} · {t(`task.submission_panel.native.evidence.privacy.${item.privacyClassification}`, item.privacyClassification)}</span>
          {#if canEdit}<button type="button" class="text-destructive" onclick={() => onRemoveEvidence(item.id)}>{t('task.submission_panel.native.evidence.remove', 'Remove')}</button>{/if}
        </li>
      {/each}
    </ul>
  {:else}
    <p class="text-sm text-muted-foreground">
      {t('task.submission_panel.native.evidence.none', 'No evidence mapped yet.')}
    </p>
  {/if}
</section>
