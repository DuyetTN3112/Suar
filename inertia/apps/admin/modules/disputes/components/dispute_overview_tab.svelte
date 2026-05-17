<script lang="ts">
  import Card from '@/apps/admin/shared/ui/card.svelte'
  import CardContent from '@/apps/admin/shared/ui/card_content.svelte'
  import CardHeader from '@/apps/admin/shared/ui/card_header.svelte'
  import CardTitle from '@/apps/admin/shared/ui/card_title.svelte'
  import Badge from '@/apps/admin/shared/ui/badge.svelte'

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
</script>

<Card class="rounded-[28px] border-border/90 bg-card">
  <CardHeader class="space-y-3">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Dispute brief
        </p>
        <CardTitle class="mt-2 text-2xl">Thông tin task & review</CardTitle>
      </div>
      <Badge variant="outline" class="rounded-full px-3 py-1.5 font-mono">
        {(dispute.status ?? 'open').toUpperCase()}
      </Badge>
    </div>
  </CardHeader>
  <CardContent class="space-y-4 text-sm font-sans">
    <div>
      <p class="font-semibold text-muted-foreground">Tên task</p>
      <p class="mt-1 text-lg font-semibold text-foreground">{dispute.task_title ?? 'Task không rõ'}</p>
    </div>
    {#if dispute.task_description}
      <div>
        <p class="font-semibold text-muted-foreground">Mô tả</p>
        <div class="mt-2 rounded-2xl border border-border/70 bg-background/70 p-4 text-sm leading-6 text-muted-foreground">
          {dispute.task_description}
        </div>
      </div>
    {/if}
    <div class="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
      <div class="rounded-2xl border border-border/70 bg-background/75 p-4">
        <p class="font-semibold text-muted-foreground">Người khiếu nại</p>
        <p class="mt-2 text-base font-semibold text-foreground">{dispute.reviewee_username ?? 'Không rõ'}</p>
        <p class="text-xs text-muted-foreground font-mono">{dispute.reviewee_email ?? ''}</p>
      </div>
      <div class="rounded-2xl border border-border/70 bg-background/75 p-4">
        <p class="font-semibold text-muted-foreground">Trạng thái review gốc</p>
        <div class="mt-2">
          <Badge variant="outline" class="font-mono">{dispute.review_session_status ?? 'N/A'}</Badge>
        </div>
      </div>
    </div>
    
    <div class="rounded-2xl border border-border/70 bg-background/75 p-4 mt-4">
      <p class="font-semibold text-muted-foreground">Đánh giá bị khiếu nại</p>
      <div class="mt-4 grid gap-4 sm:grid-cols-[100px_1fr]">
        <div class="flex flex-col items-center justify-center rounded-xl bg-muted/50 p-3">
          <span class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Điểm số</span>
          <span class="mt-1 text-3xl font-black text-foreground">{dispute.review_overall_score ?? '?'}</span>
        </div>
        <div class="space-y-3">
          {#if dispute.review_strengths}
            <div>
              <span class="text-xs font-semibold text-emerald-600 uppercase">Điểm mạnh:</span>
              <p class="mt-1 text-sm text-muted-foreground">{dispute.review_strengths}</p>
            </div>
          {/if}
          {#if dispute.review_improvements}
            <div>
              <span class="text-xs font-semibold text-rose-600 uppercase">Cần cải thiện:</span>
              <p class="mt-1 text-sm text-muted-foreground">{dispute.review_improvements}</p>
            </div>
          {/if}
        </div>
      </div>
    </div>
    {#if dispute.requested_outcome}
      <div class="rounded-2xl border border-border/70 bg-muted/40 p-4">
        <p class="font-semibold text-foreground">Kết quả người khiếu nại mong muốn</p>
        <p class="mt-2 leading-6 text-muted-foreground">{dispute.requested_outcome}</p>
      </div>
    {/if}
    {#if latestCaseFile}
      <div class="rounded-2xl border border-border/70 bg-muted/40 p-4">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p class="font-semibold text-foreground">Admin dossier mới nhất</p>
            <p class="mt-1 text-sm text-muted-foreground">Case file v{latestCaseFile.case_version}</p>
          </div>
          <Badge variant="outline" class="border-border/70 bg-card font-mono text-foreground">
            {latestCaseFile.completeness_score}% complete
          </Badge>
        </div>
        <div class="mt-4 grid gap-3 sm:grid-cols-3">
          <div class="rounded-xl border border-border/70 bg-card p-3">
            <p class="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Task comments</p>
            <p class="mt-2 text-2xl font-black text-foreground">{caseFileStats.taskComments}</p>
          </div>
          <div class="rounded-xl border border-border/70 bg-card p-3">
            <p class="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Dispute exchange</p>
            <p class="mt-2 text-2xl font-black text-foreground">{caseFileStats.disputeMessages}</p>
          </div>
          <div class="rounded-xl border border-border/70 bg-card p-3">
            <p class="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Evidence</p>
            <p class="mt-2 text-2xl font-black text-foreground">{caseFileStats.evidences}</p>
          </div>
        </div>
      </div>
    {/if}
    <div>
      <p class="font-semibold text-muted-foreground">Lý do khiếu nại</p>
      <div class="mt-2 rounded-[20px] border border-border/70 bg-rose-50/60 p-4 font-medium leading-6 text-foreground">
        {dispute.dispute_reason}
      </div>
    </div>
  </CardContent>
</Card>
