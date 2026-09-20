<script lang="ts">
  import type {
    CompletionAutonomy,
    CompletionOwnership,
  } from '../task_completion_report_payload.js'

  interface Props {
    workPerformed: string
    contributionStatement: string
    actualRole: string
    actualOwnership: CompletionOwnership | null
    actualAutonomy: CompletionAutonomy | null
    actualOutcomes: string
    impactObserved: string
    limitations: string
    remainingWork: string
    canEdit: boolean
    t: (key: string, fallback: string, params?: Record<string, unknown>) => string
  }

  let {
    workPerformed = $bindable(),
    contributionStatement = $bindable(),
    actualRole = $bindable(),
    actualOwnership = $bindable(),
    actualAutonomy = $bindable(),
    actualOutcomes = $bindable(),
    impactObserved = $bindable(),
    limitations = $bindable(),
    remainingWork = $bindable(),
    canEdit,
    t,
  }: Props = $props()
</script>

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
