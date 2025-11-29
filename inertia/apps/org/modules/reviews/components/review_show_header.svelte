<script lang="ts">
  import { ClipboardCheck, User, Calendar, CircleCheck, Clock3, AlertTriangle, ShieldCheck, Users, CheckCircle2 } from 'lucide-svelte'

  import Card from '@/apps/org/shared/ui/card.svelte'
  import CardContent from '@/apps/org/shared/ui/card_content.svelte'
  import CardHeader from '@/apps/org/shared/ui/card_header.svelte'
  import CardTitle from '@/apps/org/shared/ui/card_title.svelte'
  import Separator from '@/apps/org/shared/ui/separator.svelte'
  import { currentDocumentLocale } from '@/apps/org/shared/lib/date_locale'
  import { useTranslation } from '@/apps/org/shared/stores/translation.svelte'

  import type { ShowReviewProps } from '../types.svelte'

  import ReviewStatusBadge from './review_status_badge.svelte'

  interface Props {
    flash?: { success?: string; error?: string }
    taskTitle: string
    reviewee?: ShowReviewProps['session']['reviewee']
    createdDate: string
    completedDate: string | null
    session: ShowReviewProps['session']
  }

  const { flash, taskTitle, reviewee, createdDate, completedDate, session }: Props = $props()
  const { t } = useTranslation()
  const documentLocale = $derived(currentDocumentLocale() === 'vi' ? 'vi-VN' : 'en-US')
  const deadlineFormatter = $derived(
    new Intl.DateTimeFormat(documentLocale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  )

  const deadlineLabel = $derived.by(() => {
    if (!session.deadline) return null
    const parsed = new Date(session.deadline)
    if (Number.isNaN(parsed.getTime())) return null
    return deadlineFormatter.format(parsed)
  })

  const isOverdue = $derived.by(() => {
    if (!session.deadline || session.status === 'completed' || session.status === 'disputed') {
      return false
    }

    const parsed = new Date(session.deadline)
    if (Number.isNaN(parsed.getTime())) return false
    return parsed.getTime() < Date.now()
  })

  const pendingAssignments = $derived(
    (session.reviewer_assignments ?? []).filter((assignment) => assignment.status === 'pending')
  )
  const confirmationState = $derived.by(() => {
    const confirmations = session.confirmations ?? []
    const revieweeConfirmation = confirmations.find((entry) => entry.user_id === session.reviewee_id)
    if (revieweeConfirmation?.action === 'confirmed') return t('task.reviews.header.confirmed', {}, 'Confirmed')
    if (revieweeConfirmation?.action === 'disputed') return t('task.reviews.header.disputed', {}, 'Disputed')
    return t('task.reviews.header.pending_reviewee_confirmation', {}, 'Waiting for worker confirmation')
  })
  const laneLabel = $derived.by(() => {
    if (session.status === 'disputed') return t('task.reviews.header.lane.disputed', {}, 'In dispute')
    if (pendingAssignments.length > 0 || !session.manager_review_completed) return t('task.reviews.header.lane.collecting', {}, 'Collecting reviews')
    if (session.status === 'completed') return t('task.reviews.header.lane.awaiting_confirmation', {}, 'Awaiting confirmation')
    return t('task.reviews.header.lane.open', {}, 'Review open')
  })
  const quorumProgress = $derived.by(() => {
    const managerCount = session.manager_reviews_count ?? 0
    const peerCount = session.peer_reviews_count ?? 0
    const totalRequired = session.required_total_reviews ?? session.required_peer_reviews + (session.minimum_manager_reviews ?? 1)
    return `${managerCount + peerCount}/${totalRequired}`
  })
  const governanceRuleLabel = $derived.by(() => {
    const requiredPeer = session.required_peer_reviews ?? session.minimum_peer_reviews ?? 0
    const requiredManager = session.minimum_manager_reviews ?? 1
    return t(
      'task.reviews.header.governance_rule',
      { manager: requiredManager, peer: requiredPeer },
      `Rule: separate creator review + ${requiredManager} manager + ${requiredPeer} peers`
    )
  })
  const requiredAssignmentsPendingCount = $derived(
    (session.reviewer_assignments ?? []).filter(
      (assignment) => assignment.is_required && assignment.status !== 'submitted'
    ).length
  )
</script>

{#if flash?.success}
  <div class="rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary">
    {flash.success}
  </div>
{/if}
{#if flash?.error}
  <div class="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
    {flash.error}
  </div>
{/if}

<Card class="rounded-[28px] border-border/90 bg-card">
  <CardHeader class="space-y-4">
    <div class="flex items-start justify-between gap-4">
      <div class="space-y-2">
        <div class="flex flex-wrap items-center gap-2">
          <span class="rounded-full border border-border/70 bg-background/85 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {laneLabel}
          </span>
          {#if isOverdue}
            <span class="rounded-full border border-destructive/30 bg-destructive/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-destructive">
              {t('task.reviews.header.overdue', {}, 'Overdue')}
            </span>
          {/if}
        </div>
        <CardTitle class="text-2xl font-black tracking-tight">{taskTitle}</CardTitle>
        <div class="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          {#if reviewee}
            <div class="flex items-center gap-1.5">
              <User class="h-3.5 w-3.5" />
              <span>{t('task.reviews.header.reviewee', {}, 'Reviewee')}: <strong class="text-foreground">{reviewee.username}</strong></span>
            </div>
          {/if}
          <div class="flex items-center gap-1.5">
            <Calendar class="h-3.5 w-3.5" />
            <span>{createdDate}</span>
          </div>
          {#if completedDate}
            <div class="flex items-center gap-1.5">
              <CheckCircle2 class="h-3.5 w-3.5" />
              <span>{t('task.reviews.header.review_closed_at', {}, 'Review closed')}: {completedDate}</span>
            </div>
          {/if}
        </div>
      </div>
      <ReviewStatusBadge status={session.status} />
    </div>
  </CardHeader>
  <CardContent class="space-y-4">
    <div class="grid gap-3 md:grid-cols-4">
      <div class="rounded-2xl border border-border/70 bg-background/85 p-4">
        <div class="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          <ShieldCheck class="h-3.5 w-3.5" />
          {t('task.reviews.header.manager', {}, 'Manager')}
        </div>
        <p class="mt-2 text-lg font-bold text-foreground">
          {session.manager_review_completed
            ? t('task.reviews.header.review_available', {}, 'Available')
            : t('task.reviews.header.review_pending', {}, 'Pending')}
        </p>
      </div>
      <div class="rounded-2xl border border-border/70 bg-background/85 p-4">
        <div class="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          <ClipboardCheck class="h-3.5 w-3.5" />
          Creator
        </div>
        <p class="mt-2 text-lg font-bold text-foreground">
          {session.creator_review_completed
            ? t('task.reviews.header.review_available', {}, 'Available')
            : t('task.reviews.header.review_pending', {}, 'Pending')}
        </p>
      </div>
      <div class="rounded-2xl border border-border/70 bg-background/85 p-4">
        <div class="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          <Users class="h-3.5 w-3.5" />
          Peer
        </div>
        <p class="mt-2 text-lg font-bold text-foreground">{session.peer_reviews_count}/{session.required_peer_reviews}</p>
      </div>
      <div class="rounded-2xl border border-border/70 bg-background/85 p-4">
        <div class="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          <CircleCheck class="h-3.5 w-3.5" />
          {t('task.reviews.header.confirmation', {}, 'Confirmation')}
        </div>
        <p class="mt-2 text-lg font-bold text-foreground">{confirmationState}</p>
      </div>
    </div>

    <div class="flex flex-wrap gap-4 text-sm">
      <span class="text-muted-foreground">{t('task.reviews.header.quorum', {}, 'Quorum')}: <strong class="text-foreground">{quorumProgress}</strong></span>
      <span class="text-muted-foreground">{governanceRuleLabel}</span>
      <span class="text-muted-foreground">
        {t('task.reviews.header.required_reviewers_pending', {}, 'Required reviewers pending')}:
        <strong class="text-foreground">{requiredAssignmentsPendingCount}</strong>
      </span>
      {#if deadlineLabel}
        <Separator orientation="vertical" class="h-4" />
        <div class="flex items-center gap-1.5 {isOverdue ? 'text-destructive' : 'text-muted-foreground'}">
          {#if isOverdue}
            <AlertTriangle class="h-4 w-4" />
          {:else}
            <Clock3 class="h-4 w-4" />
          {/if}
          <span>
            {isOverdue
              ? t('task.reviews.header.review_overdue_at', {}, 'Review overdue')
              : t('task.reviews.header.review_deadline', {}, 'Review deadline')}: {deadlineLabel}
          </span>
        </div>
      {/if}
    </div>

    {#if pendingAssignments.length > 0}
      <div class="rounded-[22px] border border-border/60 bg-muted/30 p-4">
        <p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t('task.reviews.header.pending_reviewers', {}, 'Pending reviewers')}
        </p>
        <div class="mt-3 flex flex-wrap gap-2">
          {#each pendingAssignments as assignment (assignment.id)}
            <div class="rounded-full border border-border bg-background px-3 py-1.5 text-xs">
              <strong>{assignment.reviewer?.username ?? t('task.reviews.header.unknown_reviewer', {}, 'Unknown reviewer')}</strong>
              · {assignment.reviewer_type === 'manager' ? t('task.reviews.header.manager', {}, 'Manager') : t('task.reviews.header.peer', {}, 'Peer')}
              {#if assignment.is_required}
                · {t('task.reviews.header.required', {}, 'Required')}
              {/if}
            </div>
          {/each}
        </div>
      </div>
    {/if}
  </CardContent>
</Card>
