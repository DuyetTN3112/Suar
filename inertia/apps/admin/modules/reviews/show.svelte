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
  let resolveNotes = $state('')

  $effect(() => {
    resolveNotes = review.notes ?? ''
  })

  function formatDateTime(value: string | null): string {
    if (!value) return t('admin_ui.reviews.detail.unknown', {}, 'Unknown')

    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value

    return format(date, dateTimePattern(), { locale: dateFnsLocale() })
  }

  function resolve(action: 'confirm' | 'dismiss') {
    router.put(
      `/admin/reviews/${review.id}/resolve`,
      { action, notes: resolveNotes.trim() },
      { preserveState: true, preserveScroll: true }
    )
  }
</script>

  <div class="space-y-6">
    <div>
      <div>
        <p class="font-medium uppercase tracking-wider text-xs text-muted-foreground">
          {t('admin_ui.reviews.detail.eyebrow', {}, 'Admin / Review detail')}
        </p>
        <h1 class="text-4xl font-bold tracking-tight">
          {t('admin_ui.reviews.detail.title', {}, 'Flagged review detail')}
        </h1>
        <p class="mt-2 text-sm text-muted-foreground">
          {t(`admin_ui.reviews.status.${review.status}`, {}, review.status)} ·
          {t('admin_ui.reviews.detail.evidence_count', { count: evidences.length }, ':count evidence items')}
        </p>
      </div>
    </div>

    <div class="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <Card>
        <CardHeader>
          <CardTitle class="flex items-center gap-2">
            <span>{t('admin_ui.reviews.detail.context', {}, 'Review context')}</span>
            <Badge variant="outline">{t(`admin_ui.reviews.anomaly_type.${review.flag_type}`, {}, review.flag_type)}</Badge>
            <Badge variant="secondary">{t(`admin_ui.reviews.severity.${review.severity}`, {}, review.severity)}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent class="space-y-4 text-sm">
          <div class="grid gap-4 md:grid-cols-2">
            <div>
              <p class="text-muted-foreground">{t('admin_ui.reviews.detail.reviewer', {}, 'Reviewer')}</p>
              <p class="font-medium">{review.reviewer?.username ?? t('admin_ui.reviews.detail.unknown', {}, 'Unknown')}</p>
              <p class="text-muted-foreground">{review.reviewer?.email ?? t('admin_ui.reviews.detail.no_email', {}, 'No email')}</p>
            </div>
            <div>
              <p class="text-muted-foreground">{t('admin_ui.reviews.detail.reviewee', {}, 'Reviewee')}</p>
              <p class="font-medium">{review.reviewee?.username ?? t('admin_ui.reviews.detail.unknown', {}, 'Unknown')}</p>
              <p class="text-muted-foreground">{review.reviewee?.email ?? t('admin_ui.reviews.detail.no_email', {}, 'No email')}</p>
            </div>
            <div class="md:col-span-2">
              <p class="text-muted-foreground">{t('admin_ui.reviews.detail.task', {}, 'Task')}</p>
              <p class="font-medium text-lg">{review.task?.title ?? t('admin_ui.reviews.detail.unknown_task', {}, 'Unknown task')}</p>
              {#if review.task?.description}
                <div class="mt-2 rounded-2xl border border-border/70 bg-background/70 p-4 text-sm leading-6 text-muted-foreground">
                  {review.task.description}
                </div>
              {/if}
            </div>
            <div>
              <p class="text-muted-foreground">{t('admin_ui.reviews.detail.skill', {}, 'Skill')}</p>
              <p class="font-medium">{review.skill?.name ?? t('admin_ui.reviews.detail.unknown_skill', {}, 'Unknown skill')}</p>
            </div>
          </div>

          <div>
            <p class="text-muted-foreground">{t('admin_ui.reviews.detail.comment', {}, 'Comment')}</p>
            <div class="border border-border rounded-lg mt-1 p-3 bg-card text-sm">
              {review.comment ?? t('admin_ui.reviews.detail.no_comment', {}, 'No comment')}
            </div>
          </div>

          <div>
            <p class="text-muted-foreground">{t('admin_ui.reviews.detail.moderation_notes', {}, 'Moderation notes')}</p>
            <div class="border border-border rounded-lg mt-1 p-3 bg-card text-sm">
              {review.notes ?? t('admin_ui.reviews.detail.no_notes', {}, 'No notes yet')}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('admin_ui.reviews.detail.resolution_status', {}, 'Resolution status')}</CardTitle>
        </CardHeader>
        <CardContent class="space-y-4 text-sm">
          <div class="flex items-center gap-2">
            <Badge variant={review.status === 'pending' ? 'secondary' : 'outline'}>{t(`admin_ui.reviews.status.${review.status}`, {}, review.status)}</Badge>
            {#if review.reviewed_at}
              <span class="text-muted-foreground">
                {t('admin_ui.reviews.detail.reviewed_at', {}, 'Reviewed')} {formatDateTime(review.reviewed_at)}
              </span>
            {/if}
          </div>
          <div>
            <p class="text-muted-foreground">{t('admin_ui.reviews.detail.detected_at', {}, 'Detected at')}</p>
            <p class="font-medium">{formatDateTime(review.detected_at)}</p>
          </div>
          <div>
            <p class="text-muted-foreground">{t('admin_ui.reviews.detail.moderator', {}, 'Moderator')}</p>
            <p class="font-medium">{review.moderator?.username ?? t('admin_ui.reviews.detail.none', {}, 'None')}</p>
          </div>
          <div>
            <p class="text-muted-foreground">{t('admin_ui.reviews.detail.moderation_note', {}, 'Moderation note')}</p>
            <textarea
              bind:value={resolveNotes}
              rows="3"
              class="mt-1 w-full rounded-lg border border-border bg-background p-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              placeholder={t('admin_ui.reviews.detail.note_placeholder', {}, 'Record the reason here')}
            ></textarea>
          </div>
          <div class="flex gap-2">
            <Button
              disabled={review.status !== 'pending' || resolveNotes.trim().length === 0}
              onclick={() => { resolve('confirm'); }}
            >
              {t('admin_ui.reviews.detail.confirm_flag', {}, 'Confirm flag')}
            </Button>
            <Button
              variant="destructive"
              disabled={review.status !== 'pending' || resolveNotes.trim().length === 0}
              onclick={() => { resolve('dismiss'); }}
            >
              {t('admin_ui.reviews.detail.dismiss_flag', {}, 'Dismiss flag')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>

    <Card>
      <CardHeader>
        <CardTitle>{t('admin_ui.reviews.detail.evidence', {}, 'Evidence')}</CardTitle>
      </CardHeader>
      <CardContent>
        {#if evidences.length === 0}
          <p class="text-sm text-muted-foreground">
            {t('admin_ui.reviews.detail.no_evidence', {}, 'No evidence yet.')}
          </p>
        {:else}
          <div class="grid gap-3 md:grid-cols-2">
            {#each evidences as evidence}
              <div class="border border-border rounded-lg p-4 bg-card text-sm shadow-none">
                <p class="font-medium">{evidence.title ?? evidence.evidence_type}</p>
                <p class="mt-1 text-muted-foreground">{evidence.description ?? t('admin_ui.reviews.detail.no_description', {}, 'No description')}</p>
                {#if evidence.url}
                  <a class="text-foreground mt-2 inline-block hover:underline" href={evidence.url} target="_blank" rel="noreferrer">
                    {t('admin_ui.reviews.detail.open_evidence', {}, 'Open evidence')}
                  </a>
                {/if}
              </div>
            {/each}
          </div>
        {/if}
      </CardContent>
    </Card>
  </div>
