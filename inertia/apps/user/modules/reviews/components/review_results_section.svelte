<script lang="ts">
  import Card from '@/apps/user/shared/ui/card.svelte'
  import CardContent from '@/apps/user/shared/ui/card_content.svelte'
  import CardHeader from '@/apps/user/shared/ui/card_header.svelte'
  import CardTitle from '@/apps/user/shared/ui/card_title.svelte'
  import { currentDocumentLocale } from '@/apps/user/shared/lib/date_locale'
  import { useTranslation } from '@/apps/user/shared/stores/translation.svelte'

  import type { ShowReviewProps } from '../types.svelte'

  import ReviewSummary from './review_summary.svelte'

  interface Props {
    session: ShowReviewProps['session']
    proficiencyLevels: ShowReviewProps['proficiencyLevels']
    hasManagerSummary: boolean
  }

  const { session, proficiencyLevels, hasManagerSummary }: Props = $props()
  const { t } = useTranslation()
  const documentLocale = $derived(currentDocumentLocale() === 'vi' ? 'vi-VN' : 'en-US')
  const dateFormatter = $derived(new Intl.DateTimeFormat(documentLocale, { dateStyle: 'medium' }))
</script>

{#if hasManagerSummary}
  <Card class="mb-4">
    <CardHeader>
      <CardTitle class="text-base">{t('task.reviews.results.manager_summary', {}, 'Manager summary')}</CardTitle>
    </CardHeader>
    <CardContent class="space-y-4">
      <div class="grid gap-3 md:grid-cols-3">
        <div class="rounded-lg border p-3">
          <p class="text-xs uppercase tracking-wide text-muted-foreground">{t('task.reviews.results.overall_quality', {}, 'Overall quality')}</p>
          <p class="mt-1 text-2xl font-semibold">{session.overall_quality_score ?? '—'}</p>
        </div>
        <div class="rounded-lg border p-3">
          <p class="text-xs uppercase tracking-wide text-muted-foreground">{t('task.reviews.results.requirement_adherence', {}, 'Requirement adherence')}</p>
          <p class="mt-1 text-2xl font-semibold">{session.requirement_adherence ?? '—'}</p>
        </div>
        <div class="rounded-lg border p-3">
          <p class="text-xs uppercase tracking-wide text-muted-foreground">{t('task.reviews.results.communication', {}, 'Communication')}</p>
          <p class="mt-1 text-2xl font-semibold">{session.communication_quality ?? '—'}</p>
        </div>
        <div class="rounded-lg border p-3">
          <p class="text-xs uppercase tracking-wide text-muted-foreground">{t('task.reviews.results.code_quality', {}, 'Code quality')}</p>
          <p class="mt-1 text-2xl font-semibold">{session.code_quality_score ?? '—'}</p>
        </div>
        <div class="rounded-lg border p-3">
          <p class="text-xs uppercase tracking-wide text-muted-foreground">{t('task.reviews.results.proactiveness', {}, 'Proactiveness')}</p>
          <p class="mt-1 text-2xl font-semibold">{session.proactiveness_score ?? '—'}</p>
        </div>
        <div class="rounded-lg border p-3">
          <p class="text-xs uppercase tracking-wide text-muted-foreground">{t('task.reviews.results.delivery_timeliness', {}, 'Delivery timeliness')}</p>
          <p class="mt-1 text-sm font-semibold">{session.delivery_timeliness ?? '—'}</p>
        </div>
      </div>

      <div class="grid gap-4 md:grid-cols-2">
        <div class="rounded-lg border p-4">
          <p class="text-xs uppercase tracking-wide text-muted-foreground">{t('task.reviews.results.strengths_observed', {}, 'Strengths observed')}</p>
          <p class="mt-2 text-sm">{session.strengths_observed ?? '—'}</p>
        </div>
        <div class="rounded-lg border p-4">
          <p class="text-xs uppercase tracking-wide text-muted-foreground">{t('task.reviews.results.areas_for_improvement', {}, 'Areas for improvement')}</p>
          <p class="mt-2 text-sm">{session.areas_for_improvement ?? '—'}</p>
        </div>
      </div>

      <p class="text-xs text-muted-foreground">
        {t('task.reviews.results.would_work_with_again', {}, 'Would work with again')}:
        {session.would_work_with_again == null ? '—' : session.would_work_with_again ? t('task.reviews.results.yes', {}, 'Yes') : t('task.reviews.results.no', {}, 'No')}
      </p>
    </CardContent>
  </Card>
{/if}

<Card>
  <CardHeader>
    <CardTitle class="text-base">{t('task.reviews.results.review_results', {}, 'Review results')}</CardTitle>
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
      <CardTitle class="text-base">{t('task.reviews.results.confirmation_history', {}, 'Confirmation history')}</CardTitle>
    </CardHeader>
    <CardContent>
      <div class="space-y-3">
        {#each session.confirmations as entry}
          <div class="flex items-start gap-3 text-sm rounded-lg border p-3">
            <div class="flex-1">
              <div class="flex items-center gap-2">
                <span class="font-medium">
                  {entry.user_id === session.reviewee_id
                    ? t('task.reviews.results.task_worker', {}, 'Task worker')
                    : t('task.reviews.results.confirming_member', {}, 'Confirming member')}
                </span>
                <span class={entry.action === 'confirmed' ? 'text-primary' : 'text-destructive'}>
                  {entry.action === 'confirmed'
                    ? t('task.reviews.results.action_confirmed', {}, 'Confirmed')
                    : t('task.reviews.results.action_disputed', {}, 'Disputed')}
                </span>
              </div>
              {#if entry.dispute_reason}
                <p class="text-muted-foreground mt-1">{entry.dispute_reason}</p>
              {/if}
              <p class="text-xs text-muted-foreground mt-1">
                {dateFormatter.format(new Date(entry.confirmed_at))}
              </p>
            </div>
          </div>
        {/each}
      </div>
    </CardContent>
  </Card>
{/if}
