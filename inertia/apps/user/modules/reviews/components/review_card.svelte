<script lang="ts">
  /**
   * ReviewCard — displays a review session summary in a card layout.
   * Used in review session lists.
   */
  import {
    ClipboardCheck,
    User,
    Clock3,
    AlertTriangle,
    ArrowRight,
    ShieldCheck,
    Users,
    Sparkles,
    Siren,
    CheckCircle2,
  } from 'lucide-svelte'

  import type { SerializedReviewSession } from '../types.svelte'
  import { currentDocumentLocale } from '@/apps/user/shared/lib/date_locale'
  import { useTranslation } from '@/apps/user/shared/stores/translation.svelte'

  import ReviewStatusBadge from './review_status_badge.svelte'

  interface Props {
    review: SerializedReviewSession
    showReviewee?: boolean
    onClick?: (review: SerializedReviewSession) => void
  }

  const { review, showReviewee = true, onClick }: Props = $props()
  const { t } = useTranslation()
  const documentLocale = $derived(currentDocumentLocale() === 'vi' ? 'vi-VN' : 'en-US')

  type ReviewCompat = SerializedReviewSession & {
    taskAssignment?: SerializedReviewSession['task_assignment']
    revieweeId?: string
    managerReviewCompleted?: boolean
    peerReviewsCount?: number
    requiredPeerReviews?: number
    reviewerAssignments?: SerializedReviewSession['reviewer_assignments']
    createdAt?: string
    completedAt?: string | null
  }

  type ConfirmationCompat = NonNullable<SerializedReviewSession['confirmations']>[number] & {
    userId?: string
  }

  const reviewCompat = $derived(review as ReviewCompat)
  const taskAssignment = $derived(reviewCompat.task_assignment ?? reviewCompat.taskAssignment)
  const reviewerAssignments = $derived(
    reviewCompat.reviewer_assignments ?? reviewCompat.reviewerAssignments ?? []
  )
  const revieweeId = $derived(reviewCompat.reviewee_id ?? reviewCompat.revieweeId)

  const taskTitle = $derived(
    taskAssignment?.task?.title ?? t('task.reviews.card.unknown_task', {}, 'Unknown task')
  )

  const revieweeName = $derived(
    review.reviewee?.username ?? 'N/A'
  )

  const createdDate = $derived.by(() => {
    const createdAt = reviewCompat.created_at ?? reviewCompat.createdAt
    if (!createdAt) return t('task.reviews.card.no_date', {}, 'No date')
    const parsed = new Date(createdAt)
    if (Number.isNaN(parsed.getTime())) return t('task.reviews.card.no_date', {}, 'No date')
    return parsed.toLocaleDateString(documentLocale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  })

  const peerReviewsCount = $derived(reviewCompat.peer_reviews_count ?? reviewCompat.peerReviewsCount ?? 0)
  const requiredPeerReviews = $derived(reviewCompat.required_peer_reviews ?? reviewCompat.requiredPeerReviews ?? 0)
  const managerReviewCompleted = $derived(
    reviewCompat.manager_review_completed ?? reviewCompat.managerReviewCompleted ?? false
  )
  const peerProgress = $derived(
    `${peerReviewsCount}/${requiredPeerReviews}`
  )
  const taskProjectName = $derived(
    (taskAssignment?.task?.project_name as string | undefined) ??
      (taskAssignment?.task?.projectName as string | undefined) ??
      null
  )
  const pendingAssignments = $derived(
    reviewerAssignments.filter((assignment) => assignment.status === 'pending').length
  )
  const deadlineLabel = $derived.by(() => {
    if (!review.deadline) return null
    const parsed = new Date(review.deadline)
    if (Number.isNaN(parsed.getTime())) return null
    return parsed.toLocaleDateString(documentLocale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  })
  const isOverdue = $derived.by(() => {
    if (!review.deadline || review.status === 'completed' || review.status === 'disputed') {
      return false
    }

    const parsed = new Date(review.deadline)
    if (Number.isNaN(parsed.getTime())) return false
    return parsed.getTime() < Date.now()
  })
  const statusTone = $derived.by(() => {
    if (review.status === 'disputed') return 'border-rose-500/20 bg-rose-500/10'
    if (review.status === 'completed') return 'border-emerald-500/20 bg-emerald-500/10'
    return 'border-border bg-card'
  })
  const accentTone = $derived.by(() => {
    if (review.status === 'disputed') {
      return 'border-rose-500/30 bg-card'
    }
    if (review.status === 'completed') {
      return 'border-emerald-500/30 bg-card'
    }

    return 'border-border bg-card'
  })
  const confirmationState = $derived.by(() => {
    const confirmations = (review.confirmations ?? []) as ConfirmationCompat[]
    const revieweeConfirmation = confirmations.find(
      (entry) => (entry.user_id ?? entry.userId) === revieweeId
    )
    if (revieweeConfirmation?.action === 'confirmed') return t('task.reviews.card.confirmed', {}, 'Confirmed')
    if (revieweeConfirmation?.action === 'disputed') return t('task.reviews.card.disputed', {}, 'Disputed')
    return t('task.reviews.card.pending_confirmation', {}, 'Waiting for worker confirmation')
  })
  const revieweeConfirmationAction = $derived.by(() => {
    const confirmations = (review.confirmations ?? []) as ConfirmationCompat[]
    const revieweeConfirmation = confirmations.find(
      (entry) => (entry.user_id ?? entry.userId) === revieweeId
    )

    return revieweeConfirmation?.action ?? null
  })
  const actionHint = $derived.by(() => {
    if (review.status === 'disputed') return t('task.reviews.card.disputed_action_hint', {}, 'Open the dispute room to lock a conclusion.')
    if (pendingAssignments > 0) return t('task.reviews.card.pending_reviewers_hint', { count: pendingAssignments }, `${pendingAssignments} reviewers still pending.`)
    if (!managerReviewCompleted) return t('task.reviews.card.manager_pending_hint', {}, 'Waiting for the required manager or assigner review.')
    if (!revieweeConfirmationAction) return t('task.reviews.card.pending_confirmation_hint', {}, 'All reviews are in, waiting for the worker to confirm the result.')
    return t('task.reviews.card.stable_hint', {}, 'Session is healthy, open it for details.')
  })
  const urgencyLabel = $derived.by(() => {
    if (review.status === 'disputed') return t('task.reviews.card.urgency_disputed', {}, 'In dispute')
    if (isOverdue) return t('task.reviews.card.urgency_overdue', {}, 'Overdue')
    if (pendingAssignments > 0 || !managerReviewCompleted) return t('task.reviews.card.urgency_running', {}, 'Running')
    return t('task.reviews.card.urgency_stable', {}, 'Stable')
  })

  function handleClick() {
    onClick?.(review)
  }

</script>

<button
  type="button"
  class={`group w-full rounded-[26px] border p-0 text-left shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${statusTone} ${accentTone}`}
  onclick={handleClick}
>
  <div class="p-4">
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <div class="flex flex-wrap items-center gap-2">
          <span class="inline-flex items-center gap-1 rounded-full border border-border/70 bg-background/85 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {#if review.status === 'disputed'}
              <Siren class="h-3 w-3" />
            {:else if review.status === 'completed'}
              <CheckCircle2 class="h-3 w-3" />
            {:else}
              <Sparkles class="h-3 w-3" />
            {/if}
            {urgencyLabel}
          </span>
          {#if isOverdue}
            <span class="rounded-full bg-rose-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-rose-600">
              {t('task.reviews.card.overdue_badge', {}, 'Overdue')}
            </span>
          {/if}
        </div>
        <h3 class="mt-3 line-clamp-2 text-[1.02rem] font-semibold leading-6 text-foreground">{taskTitle}</h3>
        <div class="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>{t('task.reviews.card.session_label', {}, 'Review session')}</span>
          {#if taskProjectName}
            <span class="h-1 w-1 rounded-full bg-border"></span>
            <span>{taskProjectName}</span>
          {/if}
          <span class="h-1 w-1 rounded-full bg-border"></span>
          <span>{createdDate}</span>
        </div>
      </div>
      <ReviewStatusBadge status={review.status} />
    </div>

    <div class="mt-4 rounded-2xl border border-border/70 bg-background/80 p-3">
      <div class="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {t('task.reviews.card.bottleneck_title', {}, 'Current bottleneck')}
      </div>
      <p class="mt-2 text-sm leading-6 text-foreground">{actionHint}</p>
    </div>

    <div class="mt-4 grid grid-cols-3 gap-2">
      <div class="rounded-2xl border border-border/70 bg-background/80 px-3 py-3">
        <div class="flex items-center gap-2 text-[11px] uppercase tracking-wide text-muted-foreground">
          <ShieldCheck class="h-3.5 w-3.5" />
          {t('task.reviews.card.manager_label', {}, 'Manager')}
        </div>
        <div class="mt-1 text-sm font-semibold text-foreground">
          {managerReviewCompleted ? t('task.reviews.card.manager_locked', {}, 'Locked') : t('task.reviews.card.manager_pending', {}, 'Pending')}
        </div>
      </div>
      <div class="rounded-2xl border border-border/70 bg-background/80 px-3 py-3">
        <div class="flex items-center gap-2 text-[11px] uppercase tracking-wide text-muted-foreground">
          <Users class="h-3.5 w-3.5" />
          {t('task.reviews.card.peer_label', {}, 'Peer')}
        </div>
        <div class="mt-1 text-sm font-semibold text-foreground">{peerProgress}</div>
      </div>
      <div class="rounded-2xl border border-border/70 bg-background/80 px-3 py-3">
        <div class="text-[11px] uppercase tracking-wide text-muted-foreground">{t('task.reviews.card.confirmation_label', {}, 'Confirmation')}</div>
        <div class="mt-1 text-sm font-semibold text-foreground">{confirmationState}</div>
      </div>
    </div>

    <div class="mt-4 grid gap-2 text-sm text-muted-foreground">
      {#if showReviewee}
        <div class="flex items-center gap-2 rounded-xl border border-border/60 bg-background/70 px-3 py-2">
          <User class="h-3.5 w-3.5 shrink-0" />
          <span>{t('task.reviews.card.reviewee', {}, 'Reviewee')}: <strong class="text-foreground">{revieweeName}</strong></span>
        </div>
      {/if}
      <div class="flex items-center gap-2 rounded-xl border border-border/60 bg-background/70 px-3 py-2">
        <ClipboardCheck class="h-3.5 w-3.5 shrink-0" />
        <span>{t('task.reviews.card.pending_reviewers', {}, 'Pending reviewers')}: <strong class="text-foreground">{pendingAssignments}</strong></span>
      </div>
      {#if deadlineLabel}
        <div class={`flex items-center gap-2 rounded-xl border px-3 py-2 ${isOverdue ? 'border-rose-500/20 bg-rose-500/10 text-rose-600' : 'border-border/60 bg-background/70'}`}>
          {#if isOverdue}
            <AlertTriangle class="h-3.5 w-3.5 shrink-0" />
          {:else}
            <Clock3 class="h-3.5 w-3.5 shrink-0" />
          {/if}
          <span>{isOverdue ? t('task.reviews.card.urgency_overdue', {}, 'Overdue') : t('task.reviews.card.deadline', {}, 'Deadline')}: <strong class={isOverdue ? 'text-rose-600' : 'text-foreground'}>{deadlineLabel}</strong></span>
        </div>
      {/if}
    </div>
  </div>

  <div class="flex items-center justify-between border-t border-border/70 bg-background/55 px-4 py-3 text-sm">
    <span class="text-muted-foreground">{t('task.reviews.card.open_room_hint', {}, 'Open review room to inspect forms, comments, and disputes')}</span>
    <span class="inline-flex items-center gap-1 font-medium text-foreground">
      {t('task.reviews.card.view_detail', {}, 'View detail')}
      <ArrowRight class="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
    </span>
  </div>
</button>
