<script lang="ts">
  import { Link } from '@inertiajs/svelte'

  import Badge from '@/apps/user/shared/ui/badge.svelte'
  import Button from '@/apps/user/shared/ui/button.svelte'
  import Card from '@/apps/user/shared/ui/card.svelte'
  import CardContent from '@/apps/user/shared/ui/card_content.svelte'
  import { useTranslation } from '@/apps/user/shared/stores/translation.svelte'

  import type { TaskDetail } from '@/apps/user/modules/tasks/types/index.svelte'

  interface Props {
    task: TaskDetail
    onOpenSubmission?: () => void
  }

  const { task, onOpenSubmission }: Props = $props()
  const { t } = useTranslation()

  const reviewZone = $derived(task.review_zone ?? null)

  function formatReviewStatus(status: string) {
    return t(`task.review_zone.review_status.${status}`, {}, status)
  }

  function formatDisputeStatus(status: string) {
    return t(`task.review_zone.dispute_status.${status}`, {}, status)
  }

  const reviewProgressLabel = $derived.by(() => {
    if (!reviewZone?.review_session_id) {
      return null
    }

    const managerCount = reviewZone.manager_reviews_count
    const peerCount = reviewZone.peer_reviews_count
    const requiredPeer = reviewZone.required_peer_reviews ?? 0
    const managerLabel = t('task.review_zone.manager_label', {}, 'Manager')
    const peerLabel = t('task.review_zone.peer_label', {}, 'Peer')
    return t(
      'task.review_zone.progress_summary',
      { managerLabel, managerCount, peerLabel, peerCount, requiredPeer },
      `${managerLabel} ${managerCount} · ${peerLabel} ${peerCount}/${requiredPeer}`
    )
  })

  const governanceRuleLabel = $derived.by(() => {
    if (!reviewZone?.review_session_id) {
      return null
    }

    const peerMinimum = reviewZone.required_peer_reviews ?? 2
    const ownerLabel = t('task.review_zone.owner_label', {}, 'Owner')
    const peerLabel = t('task.review_zone.peer_label', {}, 'Peer')
    return t(
      'task.review_zone.governance_rule',
      { ownerLabel, peerMinimum, peerLabel },
      `${ownerLabel} + ${peerMinimum} ${peerLabel}`
    )
  })
  const requiredCheckpointSummary = $derived.by(() => {
    if (!reviewZone?.review_session_id) {
      return null
    }

    const managerCompleted = reviewZone.manager_reviews_count > 0 ? 1 : 0
    const peerCompleted = reviewZone.peer_reviews_count
    const creatorCompleted = reviewZone.creator_review_completed ? 1 : 0
    const requiredPeer = reviewZone.required_peer_reviews ?? 2
    const requiredTotal = requiredPeer + 2

    return `${managerCompleted + peerCompleted + creatorCompleted}/${requiredTotal}`
  })

  const hasReviewZone = $derived(Boolean(reviewZone || task.status === 'done' || task.status === 'in_review'))
</script>

{#if hasReviewZone}
  <Card class="border-primary/20 bg-primary/5" data-demo-section="task-review-zone">
    <CardContent class="space-y-4 p-4">
      {#if reviewZone}
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p class="text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">{t('task.review_zone.title', {}, 'Review Zone')}</p>
            <h3 class="mt-1 text-lg font-black text-foreground">
              {#if reviewZone.dispute_id}
                {t('task.review_zone.heading_dispute', {}, 'Discussing')}
              {:else if reviewZone.review_session_status === 'completed'}
                {t('task.review_zone.heading_completed', {}, 'Review data complete')}
              {:else if reviewZone.review_session_id}
                {t('task.review_zone.heading_pending', {}, 'Waiting for review')}
              {:else if reviewZone.submission_id}
                {t('task.review_zone.heading_submission_ready', {}, 'Submission ready')}
              {:else}
                {t('task.review_zone.heading_no_session', {}, 'No review session yet')}
              {/if}
            </h3>
          </div>
          <div class="flex flex-wrap gap-2">
            {#if reviewZone.review_session_status}
              <Badge variant="outline">
                {t('task.review_zone.review_label', {}, 'Review')}: {formatReviewStatus(reviewZone.review_session_status)}
              </Badge>
            {/if}
            {#if reviewZone.dispute_status}
              <Badge variant="warning">
                {t('task.review_zone.dispute_label', {}, 'Dispute')}: {formatDisputeStatus(reviewZone.dispute_status)}
              </Badge>
            {/if}
          </div>
        </div>

        <div class="grid gap-2 md:grid-cols-4">
          <div class="rounded-lg border border-border bg-background/80 px-3 py-2 text-sm">
            <p class="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{t('task.review_zone.review_label', {}, 'Review')}</p>
            <p class="mt-1 font-semibold">{reviewProgressLabel ?? t('task.review_zone.no_session', {}, 'No review session yet')}</p>
          </div>
          <div class="rounded-lg border border-border bg-background/80 px-3 py-2 text-sm">
            <p class="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{t('task.review_zone.rule_label', {}, 'Rule')}</p>
            <p class="mt-1 font-semibold">{governanceRuleLabel ?? t('task.review_zone.no_data', {}, 'No data yet')}</p>
          </div>
          <div class="rounded-lg border border-border bg-background/80 px-3 py-2 text-sm">
            <p class="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{t('task.review_zone.required_checkpoint', {}, 'Required checkpoint')}</p>
            <p class="mt-1 font-semibold">{requiredCheckpointSummary ?? t('task.review_zone.no_data', {}, 'No data yet')}</p>
          </div>
          <div class="rounded-lg border border-border bg-background/80 px-3 py-2 text-sm">
            <p class="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{t('task.review_zone.pending_label', {}, 'Pending')}</p>
            <p class="mt-1 font-semibold">{reviewZone.required_pending_assignments}</p>
          </div>
        </div>

        <div class="flex flex-wrap gap-2">
          {#if reviewZone.dispute_id}
            <Link href={`/projects/${task.project_id}/reviews/tasks?task_id=${task.id}`}>
              <Button>{t('task.review_zone.open_dispute', {}, 'Go to dispute')}</Button>
            </Link>
          {:else if reviewZone.review_session_id}
            <Link href={`/projects/${task.project_id}/reviews/tasks?task_id=${task.id}`}>
              <Button>{t('task.review_zone.open_review_session', {}, 'Go to review session')}</Button>
            </Link>
          {/if}

          {#if reviewZone.submission_id}
            <Button variant="outline" onclick={() => { onOpenSubmission?.() }}>
              {t('task.review_zone.submission_button', {}, 'Submission')}
            </Button>
          {/if}
        </div>
      {:else}
        <div class="rounded-lg border border-border bg-background/70 px-3 py-3 text-sm text-muted-foreground">
          {t('task.review_zone.empty_message', {}, 'This task is near completion or already complete, but the system does not have submission or review zone data to show here yet.')}
        </div>
      {/if}
    </CardContent>
  </Card>
{/if}
