<script lang="ts">
  import { router } from '@inertiajs/svelte'
  import { format } from 'date-fns'

  import Badge from '@/apps/admin/shared/ui/badge.svelte'
  import Button from '@/apps/admin/shared/ui/button.svelte'
  import Card from '@/apps/admin/shared/ui/card.svelte'
  import CardContent from '@/apps/admin/shared/ui/card_content.svelte'
  import CardHeader from '@/apps/admin/shared/ui/card_header.svelte'
  import CardTitle from '@/apps/admin/shared/ui/card_title.svelte'
  import { dateFnsLocale, dateTimePattern } from '@/apps/admin/shared/lib/date_locale'
  import { useTranslation } from '@/apps/admin/shared/stores/translation.svelte'

  interface Props {
    review: {
      id: string
      flag_type: string
      severity: string
      status: string
      notes: string | null
      detected_at: string | null
      reviewed_at: string | null
      reviewer: { id: string; username: string; email: string | null } | null
      reviewee: { id: string; username: string; email: string | null } | null
      moderator: { id: string; username: string; email: string | null } | null
      task: { id: string; title: string | null; description: string | null } | null
      skill: { id: string; name: string | null } | null
      comment: string | null
    }
    evidences: {
      id: string
      title: string | null
      url: string | null
      evidence_type: string
      description: string | null
      created_at: string | null
    }[]
  }

  const { review, evidences }: Props = $props()
  const { t } = useTranslation()

  function formatDateTime(value: string | null): string {
    if (!value) return t('task.reviews.flagged_detail.unknown', {}, 'Unknown')

    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value

    return format(date, dateTimePattern(), { locale: dateFnsLocale() })
  }

  function resolve(action: 'confirm' | 'dismiss') {
    router.put(
      `/admin/reviews/${review.id}/resolve`,
      { action },
      { preserveState: true, preserveScroll: true }
    )
  }
</script>

  <div class="space-y-6">
    <div>
      <div>
        <p class="font-medium uppercase tracking-wider text-xs text-muted-foreground">
          {t('task.reviews.flagged_detail.eyebrow', {}, 'Admin / Review detail')}
        </p>
        <h1 class="text-4xl font-bold tracking-tight">
          {t('task.reviews.flagged_detail.title', {}, 'Flagged review detail')}
        </h1>
        <p class="mt-2 text-sm text-muted-foreground">{review.status} · {evidences.length} evidence</p>
      </div>
    </div>

    <div class="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <Card>
        <CardHeader>
          <CardTitle class="flex items-center gap-2">
            <span>Review context</span>
            <Badge variant="outline">{review.flag_type}</Badge>
            <Badge variant="secondary">{review.severity}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent class="space-y-4 text-sm">
          <div class="grid gap-4 md:grid-cols-2">
            <div>
              <p class="text-muted-foreground">Reviewer</p>
              <p class="font-medium">{review.reviewer?.username ?? t('task.reviews.flagged_detail.unknown', {}, 'Unknown')}</p>
              <p class="text-muted-foreground">{review.reviewer?.email ?? t('common.no_email', {}, 'No email')}</p>
            </div>
            <div>
              <p class="text-muted-foreground">Reviewee</p>
              <p class="font-medium">{review.reviewee?.username ?? t('task.reviews.flagged_detail.unknown', {}, 'Unknown')}</p>
              <p class="text-muted-foreground">{review.reviewee?.email ?? t('common.no_email', {}, 'No email')}</p>
            </div>
            <div class="md:col-span-2">
              <p class="text-muted-foreground">Task</p>
              <p class="font-medium text-lg">{review.task?.title ?? t('task.reviews.flagged_detail.unknown_task', {}, 'Unknown task')}</p>
              {#if review.task?.description}
                <div class="mt-2 rounded-2xl border border-border/70 bg-background/70 p-4 text-sm leading-6 text-muted-foreground">
                  {review.task.description}
                </div>
              {/if}
            </div>
            <div>
              <p class="text-muted-foreground">Skill</p>
              <p class="font-medium">{review.skill?.name ?? t('task.reviews.flagged_detail.unknown_skill', {}, 'Unknown skill')}</p>
            </div>
          </div>

          <div>
            <p class="text-muted-foreground">Comment</p>
            <div class="border border-border rounded-lg mt-1 p-3 bg-card text-sm">
              {review.comment ?? t('task.reviews.flagged_detail.no_comment', {}, 'No comment')}
            </div>
          </div>

          <div>
            <p class="text-muted-foreground">{t('task.reviews.flagged_detail.moderation_notes', {}, 'Moderation notes')}</p>
            <div class="border border-border rounded-lg mt-1 p-3 bg-card text-sm">
              {review.notes ?? t('task.reviews.flagged_detail.no_notes', {}, 'No notes yet')}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('task.reviews.flagged_detail.resolution_status', {}, 'Resolution status')}</CardTitle>
        </CardHeader>
        <CardContent class="space-y-4 text-sm">
          <div class="flex items-center gap-2">
            <Badge variant={review.status === 'pending' ? 'secondary' : 'outline'}>{review.status}</Badge>
            {#if review.reviewed_at}
              <span class="text-muted-foreground">
                {t('task.reviews.flagged_detail.reviewed_at', {}, 'Reviewed')} {formatDateTime(review.reviewed_at)}
              </span>
            {/if}
          </div>
          <div>
            <p class="text-muted-foreground">Detected at</p>
            <p class="font-medium">{formatDateTime(review.detected_at)}</p>
          </div>
          <div>
            <p class="text-muted-foreground">Moderator</p>
            <p class="font-medium">{review.moderator?.username ?? t('task.reviews.flagged_detail.none', {}, 'None')}</p>
          </div>
          <div class="flex gap-2">
            <Button disabled={review.status !== 'pending'} onclick={() => { resolve('confirm'); }}>
              {t('task.reviews.flagged_detail.confirm_flag', {}, 'Confirm flag')}
            </Button>
            <Button variant="destructive" disabled={review.status !== 'pending'} onclick={() => { resolve('dismiss'); }}>
              {t('task.reviews.flagged_detail.dismiss_flag', {}, 'Dismiss flag')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>

    <Card>
      <CardHeader>
        <CardTitle>Evidence</CardTitle>
      </CardHeader>
      <CardContent>
        {#if evidences.length === 0}
          <p class="text-sm text-muted-foreground">
            {t('task.reviews.flagged_detail.no_evidence', {}, 'No evidence yet.')}
          </p>
        {:else}
          <div class="grid gap-3 md:grid-cols-2">
            {#each evidences as evidence}
              <div class="border border-border rounded-lg p-4 bg-card text-sm shadow-none">
                <p class="font-medium">{evidence.title ?? evidence.evidence_type}</p>
                <p class="mt-1 text-muted-foreground">{evidence.description ?? t('task.reviews.flagged_detail.no_description', {}, 'No description')}</p>
                {#if evidence.url}
                  <a class="text-foreground mt-2 inline-block hover:underline" href={evidence.url} target="_blank" rel="noreferrer">
                    {t('task.reviews.flagged_detail.open_evidence', {}, 'Open evidence')}
                  </a>
                {/if}
              </div>
            {/each}
          </div>
        {/if}
      </CardContent>
    </Card>
  </div>
