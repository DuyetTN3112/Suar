<script lang="ts">
  import Card from '@/components/ui/card.svelte'
  import CardContent from '@/components/ui/card_content.svelte'
  import CardHeader from '@/components/ui/card_header.svelte'
  import CardTitle from '@/components/ui/card_title.svelte'
  import ReviewSummary from './review_summary.svelte'
  import type { ShowReviewProps } from '../types.svelte'

  interface Props {
    session: ShowReviewProps['session']
    proficiencyLevels: ShowReviewProps['proficiencyLevels']
    hasManagerSummary: boolean
  }

  const { session, proficiencyLevels, hasManagerSummary }: Props = $props()
</script>

{#if hasManagerSummary}
  <Card class="mb-4">
    <CardHeader>
      <CardTitle class="text-base">Tổng quan từ quản lý</CardTitle>
    </CardHeader>
    <CardContent class="space-y-4">
      <div class="grid gap-3 md:grid-cols-3">
        <div class="rounded-lg border p-3">
          <p class="text-xs uppercase tracking-wide text-muted-foreground">Overall quality</p>
          <p class="mt-1 text-2xl font-semibold">{session.overall_quality_score ?? '—'}</p>
        </div>
        <div class="rounded-lg border p-3">
          <p class="text-xs uppercase tracking-wide text-muted-foreground">Requirement adherence</p>
          <p class="mt-1 text-2xl font-semibold">{session.requirement_adherence ?? '—'}</p>
        </div>
        <div class="rounded-lg border p-3">
          <p class="text-xs uppercase tracking-wide text-muted-foreground">Communication</p>
          <p class="mt-1 text-2xl font-semibold">{session.communication_quality ?? '—'}</p>
        </div>
        <div class="rounded-lg border p-3">
          <p class="text-xs uppercase tracking-wide text-muted-foreground">Code quality</p>
          <p class="mt-1 text-2xl font-semibold">{session.code_quality_score ?? '—'}</p>
        </div>
        <div class="rounded-lg border p-3">
          <p class="text-xs uppercase tracking-wide text-muted-foreground">Proactiveness</p>
          <p class="mt-1 text-2xl font-semibold">{session.proactiveness_score ?? '—'}</p>
        </div>
        <div class="rounded-lg border p-3">
          <p class="text-xs uppercase tracking-wide text-muted-foreground">Delivery timeliness</p>
          <p class="mt-1 text-sm font-semibold">{session.delivery_timeliness ?? '—'}</p>
        </div>
      </div>

      <div class="grid gap-4 md:grid-cols-2">
        <div class="rounded-lg border p-4">
          <p class="text-xs uppercase tracking-wide text-muted-foreground">Strengths observed</p>
          <p class="mt-2 text-sm">{session.strengths_observed || '—'}</p>
        </div>
        <div class="rounded-lg border p-4">
          <p class="text-xs uppercase tracking-wide text-muted-foreground">Areas for improvement</p>
          <p class="mt-2 text-sm">{session.areas_for_improvement || '—'}</p>
        </div>
      </div>

      <p class="text-xs text-muted-foreground">
        Would work with again: {session.would_work_with_again == null ? '—' : session.would_work_with_again ? 'Yes' : 'No'}
      </p>
    </CardContent>
  </Card>
{/if}

<Card>
  <CardHeader>
    <CardTitle class="text-base">Kết quả đánh giá</CardTitle>
  </CardHeader>
  <CardContent>
    <ReviewSummary
      skillReviews={session.skill_reviews ?? []}
      {proficiencyLevels}
    />
  </CardContent>
</Card>

{#if session.confirmations && session.confirmations.length > 0}
  <Card class="mt-4">
    <CardHeader>
      <CardTitle class="text-base">Lịch sử xác nhận</CardTitle>
    </CardHeader>
    <CardContent>
      <div class="space-y-3">
        {#each session.confirmations as entry}
          <div class="flex items-start gap-3 text-sm rounded-lg border p-3">
            <div class="flex-1">
              <div class="flex items-center gap-2">
                <span class="font-medium">{entry.user_id}</span>
                <span class={entry.action === 'confirmed' ? 'text-green-600' : 'text-red-600'}>
                  {entry.action === 'confirmed' ? '✓ Xác nhận' : '✗ Tranh chấp'}
                </span>
              </div>
              {#if entry.dispute_reason}
                <p class="text-muted-foreground mt-1">{entry.dispute_reason}</p>
              {/if}
              <p class="text-xs text-muted-foreground mt-1">
                {new Date(entry.confirmed_at).toLocaleDateString('vi-VN')}
              </p>
            </div>
          </div>
        {/each}
      </div>
    </CardContent>
  </Card>
{/if}
