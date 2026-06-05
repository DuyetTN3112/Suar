<script lang="ts">
  import Card from '@/apps/org/shared/ui/card.svelte'
  import CardContent from '@/apps/org/shared/ui/card_content.svelte'
  import CardHeader from '@/apps/org/shared/ui/card_header.svelte'
  import CardTitle from '@/apps/org/shared/ui/card_title.svelte'
  import Badge from '@/apps/org/shared/ui/badge.svelte'
  import Button from '@/apps/org/shared/ui/button.svelte'
  import Textarea from '@/apps/org/shared/ui/textarea.svelte'
  import { useTranslation } from '@/apps/org/shared/stores/translation.svelte'

  interface Dispute {
    id: string
    task_title: string | null
    status: string
    dispute_reason: string
    requested_outcome: string
    reviewee_username: string | null
  }

  interface Props {
    dispute: Dispute
    statusMap: Record<string, { label: string; variant: 'destructive' | 'secondary' | 'outline' | 'default' } | undefined>
    canRespond: boolean
    canReportToAdmin: boolean
    reportReason: string
    reportingDispute: boolean
    taskCommentCount: number
    exchangeCount: number
    evidenceCount: number
    onReportToAdmin: () => void
  }

  let {
    dispute,
    statusMap,
    canRespond,
    canReportToAdmin,
    reportReason = $bindable(),
    reportingDispute,
    taskCommentCount,
    exchangeCount,
    evidenceCount,
    onReportToAdmin,
  }: Props = $props()

  const { t } = useTranslation()

  const revieweeCanEscalateAfterExchange = $derived(!canRespond && exchangeCount >= 2)
  const canShowReportControls = $derived(canRespond || canReportToAdmin || revieweeCanEscalateAfterExchange)
  const canSubmitReport = $derived(canReportToAdmin || revieweeCanEscalateAfterExchange)
</script>

<div class="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
  <Card class="rounded-[28px] border-border bg-card">
    <CardHeader class="space-y-4">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {t('task.reviews.disputes.overview.brief', {}, 'Dispute brief')}
          </p>
          <CardTitle class="mt-2 text-2xl font-black tracking-tight">
            {t('task.reviews.disputes.overview.title', {}, 'Dispute details')}
          </CardTitle>
        </div>
        <Badge variant={statusMap[dispute.status]?.variant ?? 'outline'} class="rounded-full px-3 py-1 text-[10px] font-mono">
          {statusMap[dispute.status]?.label ?? dispute.status}
        </Badge>
      </div>

      <div class="grid gap-3 md:grid-cols-3">
        <div class="min-w-0 rounded-2xl border border-border bg-background/80 p-4">
          <div class="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{t('task.reviews.disputes.overview.task', {}, 'Task')}</div>
          <div class="mt-2 break-words text-sm font-semibold text-foreground">{dispute.task_title ?? t('task.reviews.disputes.overview.task_unknown', {}, 'Unknown task')}</div>
        </div>
        <div class="min-w-0 rounded-2xl border border-border bg-background/80 p-4">
          <div class="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{t('task.reviews.disputes.overview.reviewee', {}, 'Reviewee')}</div>
          <div class="mt-2 break-words text-sm font-semibold text-foreground">{dispute.reviewee_username ?? t('task.reviews.disputes.overview.unknown', {}, 'Unknown')}</div>
        </div>
        <div class="min-w-0 rounded-2xl border border-border bg-background/80 p-4">
          <div class="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{t('task.reviews.disputes.overview.requested_outcome', {}, 'Requested outcome')}</div>
          <div class="mt-2">
            <Badge variant="outline" class="whitespace-normal break-words rounded-full px-3 py-1 font-sans leading-4">{dispute.requested_outcome}</Badge>
          </div>
        </div>
      </div>
    </CardHeader>

    <CardContent class="space-y-4 text-sm font-sans">
      <div class="rounded-2xl border border-border bg-card p-4">
        <p class="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{t('task.reviews.disputes.overview.statement', {}, 'Dispute statement')}</p>
        <div class="mt-3 whitespace-pre-wrap text-sm font-medium leading-6 text-foreground">
          {dispute.dispute_reason}
        </div>
      </div>
    </CardContent>
  </Card>

  <Card class="rounded-[28px] border-border bg-background">
    <CardHeader>
      <CardTitle class="text-xl font-black tracking-tight">{t('task.reviews.disputes.overview.escalation_title', {}, 'Escalation')}</CardTitle>
    </CardHeader>
    <CardContent class="space-y-4 text-sm">
      <div class="rounded-2xl border border-border bg-muted/20 p-4">
        <p class="font-semibold text-foreground">{t('task.reviews.disputes.overview.process_lane', {}, 'Process lane')}</p>
        <div class="mt-3 grid gap-2 text-sm text-muted-foreground">
          <div>{t('task.reviews.disputes.overview.discussion', {}, 'Discussion')}</div>
          <div>{t('task.reviews.disputes.overview.evidence', {}, 'Evidence')}</div>
          <div>{t('task.reviews.disputes.overview.report_admin', {}, 'Report admin')}</div>
        </div>
      </div>

      <div class="rounded-2xl border border-border bg-background/70 p-4">
        <p class="font-semibold text-foreground">{t('task.reviews.disputes.overview.admin_package', {}, 'Admin package')}</p>
        <div class="mt-3 grid gap-3 sm:grid-cols-3">
          <div class="rounded-xl border border-border bg-card p-3">
            <p class="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{t('task.reviews.disputes.overview.task_comments', {}, 'All task comments')}</p>
            <p class="mt-2 text-lg font-black text-foreground">{taskCommentCount} {t('task.reviews.disputes.overview.items', {}, 'items')}</p>
          </div>
          <div class="rounded-xl border border-border bg-card p-3">
            <p class="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{t('task.reviews.disputes.overview.exchanges', {}, 'Dispute exchanges')}</p>
            <p class="mt-2 text-lg font-black text-foreground">{exchangeCount} {t('task.reviews.disputes.overview.turns', {}, 'turns')}</p>
          </div>
          <div class="rounded-xl border border-border bg-card p-3">
            <p class="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{t('task.reviews.disputes.overview.additional_evidence', {}, 'Additional evidence')}</p>
            <p class="mt-2 text-lg font-black text-foreground">{evidenceCount} {t('task.reviews.disputes.overview.items', {}, 'items')}</p>
          </div>
        </div>
      </div>

      {#if canShowReportControls && dispute.status !== 'resolved' && dispute.status !== 'rejected' && dispute.status !== 'admin_reviewing' && dispute.status !== 'ai_reviewing'}
        <div class="space-y-3 rounded-2xl border border-border/70 bg-muted/40 p-4">
          <p class="font-semibold text-foreground">{t('task.reviews.disputes.overview.cannot_self_resolve', {}, 'Cannot resolve it here?')}</p>
          <Textarea
            bind:value={reportReason}
            placeholder={t('task.reviews.disputes.overview.report_placeholder', {}, 'Briefly explain why admin intervention is needed...')}
            rows={4}
          />
          {#if !canSubmitReport}
            <div class="rounded-xl border border-dashed border-border/70 bg-card/70 px-3 py-3 text-xs text-foreground">
              {t('task.reviews.disputes.overview.two_sides_required', {}, 'Need both sides in discussion.')}
            </div>
          {/if}
          <Button
            class="w-full"
            variant="outline"
            onclick={onReportToAdmin}
            disabled={reportingDispute || !reportReason.trim() || !canSubmitReport}
          >
            {reportingDispute
              ? t('task.reviews.disputes.overview.reporting', {}, 'Reporting...')
              : t('task.reviews.disputes.overview.report_admin', {}, 'Report admin')}
          </Button>
        </div>
      {:else}
        <div class="rounded-2xl border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
          {t('task.reviews.disputes.overview.closed_hint', {}, 'Dispute is already in formal handling or finished.')}
        </div>
      {/if}
    </CardContent>
  </Card>
</div>
