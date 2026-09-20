<script lang="ts">
  import type {
    NativeCriterion,
    NativeReportField,
  } from '../task_completion_report_native_form.types.js'
  import type { CompletionCriterionDraft } from '../task_completion_report_payload.js'

  interface Props {
    criteria: readonly NativeCriterion[]
    criterionDrafts: Record<string, CompletionCriterionDraft>
    canEdit: boolean
    t: (key: string, fallback: string, params?: Record<string, unknown>) => string
    onSetCriterionField: (criterionId: string, field: NativeReportField, value: string) => void
    evidenceIdsForCriterion: (criterionId: string) => string[]
  }

  let {
    criteria,
    criterionDrafts,
    canEdit,
    t,
    onSetCriterionField,
    evidenceIdsForCriterion,
  }: Props = $props()
</script>

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
            oninput={(event) => onSetCriterionField(criterion.id, 'actualOutcome', event.currentTarget.value)}
          ></textarea>
        </label>
        <label class="space-y-1 text-sm">
          <span>{t('task.submission_panel.native.criteria.result', 'Result')}</span>
          <select
            class="w-full rounded border bg-background p-2"
            value={draft?.result ?? ''}
            disabled={!canEdit}
            onchange={(event) => onSetCriterionField(criterion.id, 'result', event.currentTarget.value)}
          >
            <option value="">{t('task.submission_panel.native.criteria.select_result', 'Select result')}</option>
            <option value="met">{t('task.submission_panel.native.criteria.results.met', 'Met')}</option>
            <option value="partially_met">{t('task.submission_panel.native.criteria.results.partially_met', 'Partially met')}</option>
            <option value="not_met">{t('task.submission_panel.native.criteria.results.not_met', 'Not met')}</option>
            <option value="not_applicable">{t('task.submission_panel.native.criteria.results.not_applicable', 'Not applicable')}</option>
          </select>
        </label>
      </div>
      <label class="space-y-1 text-sm">
        <span>{t('task.submission_panel.native.criteria.explanation', 'Explanation')}</span>
        <textarea
          class="min-h-20 w-full rounded border bg-background p-2"
          value={draft?.explanation ?? ''}
          disabled={!canEdit}
          oninput={(event) => onSetCriterionField(criterion.id, 'explanation', event.currentTarget.value)}
        ></textarea>
      </label>
      <div class="grid gap-3 md:grid-cols-2">
        <label class="space-y-1 text-sm">
          <span>{t('task.submission_panel.native.criteria.deviation_status', 'Deviation status')}</span>
          <select
            class="w-full rounded border bg-background p-2"
            value={draft?.deviationStatus ?? 'none'}
            disabled={!canEdit}
            onchange={(event) => onSetCriterionField(criterion.id, 'deviationStatus', event.currentTarget.value)}
          >
            <option value="none">{t('task.submission_panel.native.criteria.deviations.none', 'None')}</option>
            <option value="reported">{t('task.submission_panel.native.criteria.deviations.reported', 'Reported')}</option>
            <option value="approved">{t('task.submission_panel.native.criteria.deviations.approved', 'Approved')}</option>
            <option value="governed_exception">{t('task.submission_panel.native.criteria.deviations.governed_exception', 'Governed exception')}</option>
          </select>
        </label>
      </div>
      {#if draft?.deviationStatus && draft.deviationStatus !== 'none'}
        <div class="grid gap-3 md:grid-cols-2">
          <label class="space-y-1 text-sm">
            <span>{t('task.submission_panel.native.criteria.deviation_summary', 'Deviation summary')}</span>
            <input
              class="w-full rounded border bg-background p-2"
              value={draft.deviationSummary ?? ''}
              disabled={!canEdit}
              oninput={(event) => onSetCriterionField(criterion.id, 'deviationSummary', event.currentTarget.value)}
            />
          </label>
          {#if draft.deviationStatus === 'approved' || draft.deviationStatus === 'governed_exception'}
            <label class="space-y-1 text-sm">
              <span>{t('task.submission_panel.native.criteria.deviation_approval_ref', 'Deviation approval reference')}</span>
              <input
                class="w-full rounded border bg-background p-2"
                value={draft.deviationApprovalRef ?? ''}
                disabled={!canEdit}
                oninput={(event) => onSetCriterionField(criterion.id, 'deviationApprovalRef', event.currentTarget.value)}
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
              oninput={(event) => onSetCriterionField(criterion.id, 'notApplicableReason', event.currentTarget.value)}
            />
          </label>
          <label class="space-y-1 text-sm">
            <span>{t('task.submission_panel.native.criteria.not_applicable_policy_ref', 'Not-applicable policy reference')}</span>
            <input
              class="w-full rounded border bg-background p-2"
              value={draft.notApplicablePolicyRef ?? ''}
              disabled={!canEdit}
              oninput={(event) => onSetCriterionField(criterion.id, 'notApplicablePolicyRef', event.currentTarget.value)}
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
