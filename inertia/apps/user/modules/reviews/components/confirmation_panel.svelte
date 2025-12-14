<script lang="ts">
  /**
   * ConfirmationPanel — allows reviewee to confirm or dispute a review.
   */
  import { router } from '@inertiajs/svelte'

  import Button from '@/apps/user/shared/ui/button.svelte'
  import Label from '@/apps/user/shared/ui/label.svelte'
  import Textarea from '@/apps/user/shared/ui/textarea.svelte'
  import { useTranslation } from '@/apps/user/shared/stores/translation.svelte'

  import type {
    ReviewConfirmationAction,
    SerializedReviewSession,
  } from '../types.svelte'

  interface Props {
    sessionId: string
    session: SerializedReviewSession
    disabled?: boolean
  }

  const { sessionId, session, disabled = false }: Props = $props()
  const { t } = useTranslation()

  let action = $state<ReviewConfirmationAction | null>(null)
  let disputeReason = $state('')
  let submitting = $state(false)

  const managerCompleted = $derived(Boolean(session.manager_review_completed))
  const peerProgress = $derived(
    `${session.peer_reviews_count}/${session.required_peer_reviews}`
  )
  const creatorReviewCompleted = $derived(
    session.creator_review_completed == null ? null : Boolean(session.creator_review_completed)
  )
  const requiredAssignmentsPending = $derived(
    (session.reviewer_assignments ?? []).filter(
      (assignment) => assignment.is_required && assignment.status !== 'submitted'
    ).length
  )

  const isValid = $derived(
    action !== null && (action === 'confirmed' || disputeReason.trim().length > 0)
  )

  function completionLabel(value: boolean | null): string {
    if (value === null) return t('task.reviews.confirmation.unknown', {}, 'Unknown')

    return value
      ? t('task.reviews.confirmation.available', {}, 'Submitted')
      : t('task.reviews.confirmation.missing', {}, 'Missing')
  }

  function handleSubmit() {
    if (!isValid || submitting || disabled || !action) return

    submitting = true
    router.post(
      `/reviews/${sessionId}/confirm`,
      {
        action,
        disputeReason: action === 'disputed' ? disputeReason : undefined,
      },
      {
        preserveState: true,
        preserveScroll: true,
        onFinish: () => { submitting = false },
      }
    )
  }
</script>

<form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} class="space-y-4" data-demo-section="review-confirmation-panel">
  <div class="space-y-3">
    <div>
      <p class="text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">{t('task.reviews.confirmation.eyebrow', {}, 'Review decision')}</p>
      <h3 class="mt-1 text-lg font-black text-foreground">{t('task.reviews.confirmation.title', {}, 'Confirm result')}</h3>
    </div>
    <div class="grid gap-3 md:grid-cols-3">
      <div class="rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm">
        <p class="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{t('task.reviews.confirmation.manager', {}, 'Manager')}</p>
        <p class="mt-1 font-semibold">{completionLabel(managerCompleted)}</p>
      </div>
      <div class="rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm">
        <p class="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{t('task.reviews.confirmation.peer', {}, 'Peer')}</p>
        <p class="mt-1 font-semibold">{peerProgress}</p>
      </div>
      <div class="rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm">
        <p class="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{t('task.reviews.confirmation.creator', {}, 'Creator')}</p>
        <p class="mt-1 font-semibold">
          {completionLabel(creatorReviewCompleted)}
        </p>
      </div>
    </div>

    {#if requiredAssignmentsPending > 0}
      <div class="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-600">
        {t('task.reviews.confirmation.required_pending', { count: requiredAssignmentsPending }, ':count required reviewers pending.')}
      </div>
    {/if}
  </div>

  <div class="flex gap-3">
    <Button
      type="button"
      variant={action === 'confirmed' ? 'default' : 'outline'}
      onclick={() => { action = 'confirmed' }}
      disabled={disabled}
      class="flex-1"
    >
      {t('task.reviews.confirmation.confirm', {}, 'Confirm')}
    </Button>
    <Button
      type="button"
      variant={action === 'disputed' ? 'destructive' : 'outline'}
      onclick={() => { action = 'disputed' }}
      disabled={disabled}
      class="flex-1"
    >
      {t('task.reviews.confirmation.dispute', {}, 'Dispute')}
    </Button>
  </div>

    {#if action === 'confirmed'}
    <div class="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-3 text-sm text-emerald-600">
      {t('task.reviews.confirmation.profile_update_hint', {}, 'Profile will be updated.')}
    </div>
  {/if}

  {#if action === 'disputed'}
    <div class="space-y-3 rounded-lg border border-destructive/20 bg-destructive/5 p-4">
      <div class="space-y-2">
        <Label for="dispute-reason">{t('task.reviews.confirmation.dispute_reason', {}, 'Dispute reason')} <span class="text-destructive">*</span></Label>
        <Textarea
          id="dispute-reason"
          bind:value={disputeReason}
          placeholder={t('task.reviews.confirmation.dispute_placeholder', {}, 'Point you disagree with...')}
          rows={4}
          disabled={disabled}
        />
      </div>
    </div>
  {/if}

  <Button type="submit" disabled={!isValid || submitting || disabled} class="w-full">
    {#if submitting}
      {t('task.reviews.confirmation.processing', {}, 'Processing...')}
    {:else if action === 'confirmed'}
      {t('task.reviews.confirmation.send_confirmation', {}, 'Send confirmation')}
    {:else if action === 'disputed'}
      {t('task.reviews.confirmation.send_dispute', {}, 'Send dispute')}
    {:else}
      {t('task.reviews.confirmation.choose_action', {}, 'Choose action')}
    {/if}
  </Button>
</form>
