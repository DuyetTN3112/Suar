<script lang="ts">
  import Card from '@/apps/admin/shared/ui/card.svelte'
  import CardContent from '@/apps/admin/shared/ui/card_content.svelte'
  import CardHeader from '@/apps/admin/shared/ui/card_header.svelte'
  import CardTitle from '@/apps/admin/shared/ui/card_title.svelte'
  import Label from '@/apps/admin/shared/ui/label.svelte'
  import Textarea from '@/apps/admin/shared/ui/textarea.svelte'
  import Button from '@/apps/admin/shared/ui/button.svelte'
  import { useTranslation } from '@/apps/admin/shared/stores/translation.svelte'

  interface Props {
    finalDecision: 'uphold_review' | 'adjust_score' | 'request_re_review' | 'dismiss_dispute' | 'partially_accept'
    profileUpdateAction: 'recalculate_after_adjustment' | 'no_action'
    reviewerCredibilityAction: 'mark_disputed_review' | 'no_action'
    finalRationale: string
    overrideReadiness: boolean
    overrideReason: string
    normalResolveBlocked: boolean
    resolving: boolean
    canResolve: boolean
    onResolve: () => void
  }

  let {
    finalDecision = $bindable(),
    profileUpdateAction = $bindable(),
    reviewerCredibilityAction = $bindable(),
    finalRationale = $bindable(),
    overrideReadiness = $bindable(),
    overrideReason = $bindable(),
    normalResolveBlocked,
    resolving,
    canResolve,
    onResolve,
  }: Props = $props()

  const { t } = useTranslation()
</script>

<Card class="rounded-xl border-destructive/30 bg-destructive/5" data-demo-section="admin-dispute-resolution-form">
  <CardHeader>
    <div class="text-[11px] font-black uppercase tracking-[0.18em] text-destructive/80">
      {t('task.disputes.admin_detail.resolve.form.eyebrow', {}, 'Final authority')}
    </div>
    <CardTitle class="mt-1 text-xl text-destructive">
      {t('task.disputes.admin_detail.resolve.form.title', {}, 'Resolution decision')}
    </CardTitle>
  </CardHeader>
  <CardContent class="space-y-4">
    <div class="space-y-2 font-sans">
      <Label for="decision">{t('task.disputes.admin_detail.resolve.form.final_decision', {}, 'Final decision')}</Label>
      <select
        id="decision"
        bind:value={finalDecision}
        class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <option value="dismiss_dispute">{t('task.disputes.admin_detail.resolve.form.decisions.dismiss_dispute', {}, 'Dismiss dispute')}</option>
        <option value="uphold_review">{t('task.disputes.admin_detail.resolve.form.decisions.uphold_review', {}, 'Uphold dispute')}</option>
        <option value="partially_accept">{t('task.disputes.admin_detail.resolve.form.decisions.partially_accept', {}, 'Partially accept')}</option>
        <option value="adjust_score">{t('task.disputes.admin_detail.resolve.form.decisions.adjust_score', {}, 'Adjust score directly')}</option>
        <option value="request_re_review">{t('task.disputes.admin_detail.resolve.form.decisions.request_re_review', {}, 'Request re-review')}</option>
      </select>
    </div>

    <div class="space-y-2 font-sans">
      <Label for="profile-action">{t('task.disputes.admin_detail.resolve.form.profile_action', {}, 'Profile update action')}</Label>
      <select
        id="profile-action"
        bind:value={profileUpdateAction}
        class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none"
      >
        <option value="no_action">{t('task.disputes.admin_detail.resolve.form.profile_actions.no_action', {}, 'Keep profile unchanged')}</option>
        <option value="recalculate_after_adjustment">{t('task.disputes.admin_detail.resolve.form.profile_actions.recalculate_after_adjustment', {}, 'Recalculate profile')}</option>
      </select>
    </div>

    <div class="space-y-2 font-sans">
      <Label for="credibility-action">{t('task.disputes.admin_detail.resolve.form.reviewer_action', {}, 'Reviewer action')}</Label>
      <select
        id="credibility-action"
        bind:value={reviewerCredibilityAction}
        class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none"
      >
        <option value="no_action">{t('task.disputes.admin_detail.resolve.form.reviewer_actions.no_action', {}, 'No action')}</option>
        <option value="mark_disputed_review">{t('task.disputes.admin_detail.resolve.form.reviewer_actions.mark_disputed_review', {}, 'Mark reviewer credibility')}</option>
      </select>
    </div>

    <div class="space-y-2 font-sans">
      <Label for="rationale">
        {t('task.disputes.admin_detail.resolve.form.rationale', {}, 'Decision rationale')}
        <span class="text-destructive">*</span>
      </Label>
      <Textarea
        id="rationale"
        bind:value={finalRationale}
        placeholder={t('task.disputes.admin_detail.resolve.form.rationale_placeholder', {}, 'Enter detailed reasoning...')}
        rows={3}
      />
    </div>

    {#if normalResolveBlocked}
      <div class="rounded-xl border border-destructive/30 bg-background p-4 font-sans">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p class="text-sm font-black text-destructive">
              {t('task.disputes.admin_detail.resolve.form.dossier_blocked', {}, 'Dossier is missing required data')}
            </p>
          </div>
          <label class="flex items-center gap-2 text-sm font-semibold">
            <input type="checkbox" bind:checked={overrideReadiness} />
            {t('task.disputes.admin_detail.resolve.form.override', {}, 'Override')}
          </label>
        </div>

        {#if overrideReadiness}
          <div class="mt-3 space-y-2">
            <Label for="override-reason">
              {t('task.disputes.admin_detail.resolve.form.override_reason', {}, 'Override reason')}
              <span class="text-destructive">*</span>
            </Label>
            <Textarea
              id="override-reason"
              bind:value={overrideReason}
              placeholder={t('task.disputes.admin_detail.resolve.form.override_placeholder', {}, 'Explain why the dispute must be resolved despite missing dossier data...')}
              rows={2}
            />
          </div>
        {/if}
      </div>
    {/if}

    <Button
      variant="destructive"
      class="w-full font-sans font-semibold"
      onclick={onResolve}
      disabled={resolving || !canResolve}
    >
      {resolving
        ? t('task.disputes.admin_detail.resolve.form.resolving', {}, 'Resolving...')
        : t('task.disputes.admin_detail.resolve.form.resolve', {}, 'Issue decision')}
    </Button>
  </CardContent>
</Card>
