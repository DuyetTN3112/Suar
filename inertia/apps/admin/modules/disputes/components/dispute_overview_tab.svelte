<script lang="ts">
  import Card from '@/apps/admin/shared/ui/card.svelte'
  import CardContent from '@/apps/admin/shared/ui/card_content.svelte'
  import CardHeader from '@/apps/admin/shared/ui/card_header.svelte'
  import CardTitle from '@/apps/admin/shared/ui/card_title.svelte'
  import Badge from '@/apps/admin/shared/ui/badge.svelte'
  import { useTranslation } from '@/apps/admin/shared/stores/translation.svelte'

  interface Dispute {
    id: string
    task_title: string | null
    task_description: string | null
    reviewee_username: string | null
    reviewee_email: string | null
    dispute_reason: string
    review_session_status: string | null
    review_overall_score?: number | null
    review_strengths?: string | null
    review_improvements?: string | null
    requested_outcome?: string | null
    status?: string
  }

  interface Props {
    dispute: Dispute
    latestCaseFile?: {
      case_version: number
      completeness_score: number
    } | null
    caseFileStats?: {
      taskComments: number
      disputeMessages: number
      evidences: number
    }
  }

  let {
    dispute,
    latestCaseFile = null,
    caseFileStats = {
      taskComments: 0,
      disputeMessages: 0,
      evidences: 0,
    },
  }: Props = $props()
  const { t } = useTranslation()
</script>

<Card class="rounded-[28px] border-border/90 bg-card">
  <CardHeader class="space-y-3">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          {t('task.disputes.admin_detail.overview_tab.brief', {}, 'Dispute brief')}
        </p>
        <CardTitle class="mt-2 text-2xl">{t('task.disputes.admin_detail.overview_tab.title', {}, 'Task and review information')}</CardTitle>
      </div>
      <Badge variant="outline" class="rounded-full px-3 py-1.5 font-mono">
        {(dispute.status ?? 'open').toUpperCase()}
      </Badge>
    </div>
  </CardHeader>
  <CardContent class="space-y-4 text-sm font-sans">
    <div>
      <p class="font-semibold text-muted-foreground">{t('task.disputes.admin_detail.overview_tab.task_name', {}, 'Task name')}</p>
      <p class="mt-1 text-lg font-semibold text-foreground">{dispute.task_title ?? t('task.disputes.admin_detail.overview_tab.unknown_task', {}, 'Unknown task')}</p>
    </div>
    {#if dispute.task_description}
      <div>
        <p class="font-semibold text-muted-foreground">{t('task.disputes.admin_detail.overview_tab.description', {}, 'Description')}</p>
        <div class="mt-2 rounded-2xl border border-border/70 bg-background/70 p-4 text-sm leading-6 text-muted-foreground">
          {dispute.task_description}
        </div>
      </div>
    {/if}
    <div class="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
      <div class="rounded-2xl border border-border/70 bg-background/75 p-4">
        <p class="font-semibold text-muted-foreground">{t('task.disputes.admin_detail.overview_tab.reviewee', {}, 'Complainant')}</p>
        <p class="mt-2 text-base font-semibold text-foreground">{dispute.reviewee_username ?? t('task.disputes.admin_detail.overview_tab.unknown', {}, 'Unknown')}</p>
        <p class="text-xs text-muted-foreground font-mono">{dispute.reviewee_email ?? ''}</p>
      </div>
      <div class="rounded-2xl border border-border/70 bg-background/75 p-4">
        <p class="font-semibold text-muted-foreground">{t('task.disputes.admin_detail.overview_tab.source_review_status', {}, 'Original review status')}</p>
        <div class="mt-2">
          <Badge variant="outline" class="font-mono">{dispute.review_session_status ?? 'N/A'}</Badge>
        </div>
      </div>
    </div>
    
    <div class="rounded-2xl border border-border/70 bg-background/75 p-4 mt-4">
      <p class="font-semibold text-muted-foreground">{t('task.disputes.admin_detail.overview_tab.disputed_review', {}, 'Disputed review')}</p>
      <div class="mt-4 grid gap-4 sm:grid-cols-[100px_1fr]">
        <div class="flex flex-col items-center justify-center rounded-xl bg-muted/50 p-3">
          <span class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('task.disputes.admin_detail.overview_tab.score', {}, 'Score')}</span>
          <span class="mt-1 text-3xl font-black text-foreground">{dispute.review_overall_score ?? '?'}</span>
        </div>
        <div class="space-y-3">
          {#if dispute.review_strengths}
            <div>
              <span class="text-xs font-semibold text-emerald-600 uppercase">{t('task.disputes.admin_detail.overview_tab.strengths', {}, 'Strengths:')}</span>
              <p class="mt-1 text-sm text-muted-foreground">{dispute.review_strengths}</p>
            </div>
          {/if}
          {#if dispute.review_improvements}
            <div>
              <span class="text-xs font-semibold text-destructive uppercase">{t('task.disputes.admin_detail.overview_tab.improvements', {}, 'Needs improvement:')}</span>
              <p class="mt-1 text-sm text-muted-foreground">{dispute.review_improvements}</p>
            </div>
          {/if}
        </div>
      </div>
    </div>
    {#if dispute.requested_outcome}
      <div class="rounded-2xl border border-border/70 bg-muted/40 p-4">
        <p class="font-semibold text-foreground">{t('task.disputes.admin_detail.overview_tab.requested_outcome', {}, 'Requested outcome')}</p>
        <p class="mt-2 leading-6 text-muted-foreground">{dispute.requested_outcome}</p>
      </div>
    {/if}
    {#if latestCaseFile}
      <div class="rounded-2xl border border-border/70 bg-muted/40 p-4">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p class="font-semibold text-foreground">{t('task.disputes.admin_detail.overview_tab.latest_dossier', {}, 'Latest admin dossier')}</p>
            <p class="mt-1 text-sm text-muted-foreground">
              {t(
                'task.disputes.admin_detail.resolve.case_file_version',
                { version: latestCaseFile.case_version },
                'Case file v:version'
              )}
            </p>
          </div>
          <Badge variant="outline" class="border-border/70 bg-card font-mono text-foreground">
            {t(
              'task.disputes.admin_detail.resolve.completeness',
              { score: latestCaseFile.completeness_score },
              ':score% complete'
            )}
          </Badge>
        </div>
        <div class="mt-4 grid gap-3 sm:grid-cols-3">
          <div class="rounded-xl border border-border/70 bg-card p-3">
            <p class="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{t('task.disputes.admin_detail.overview_tab.task_comments', {}, 'Task comments')}</p>
            <p class="mt-2 text-2xl font-black text-foreground">{caseFileStats.taskComments}</p>
          </div>
          <div class="rounded-xl border border-border/70 bg-card p-3">
            <p class="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{t('task.disputes.admin_detail.overview_tab.dispute_exchange', {}, 'Dispute exchange')}</p>
            <p class="mt-2 text-2xl font-black text-foreground">{caseFileStats.disputeMessages}</p>
          </div>
          <div class="rounded-xl border border-border/70 bg-card p-3">
            <p class="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{t('task.disputes.admin_detail.overview_tab.evidence', {}, 'Evidence')}</p>
            <p class="mt-2 text-2xl font-black text-foreground">{caseFileStats.evidences}</p>
          </div>
        </div>
      </div>
    {/if}
    <div>
      <p class="font-semibold text-muted-foreground">{t('task.disputes.admin_detail.overview_tab.reason', {}, 'Dispute reason')}</p>
      <div class="mt-2 rounded-[20px] border border-border/70 bg-destructive/10 p-4 font-medium leading-6 text-foreground">
        {dispute.dispute_reason}
      </div>
    </div>
  </CardContent>
</Card>
