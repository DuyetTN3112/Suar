<script lang="ts">
  import { router } from '@inertiajs/svelte'

  import Badge from '@/apps/admin/shared/ui/badge.svelte'
  import Button from '@/apps/admin/shared/ui/button.svelte'
  import Card from '@/apps/admin/shared/ui/card.svelte'
  import CardContent from '@/apps/admin/shared/ui/card_content.svelte'
  import CardHeader from '@/apps/admin/shared/ui/card_header.svelte'
  import CardTitle from '@/apps/admin/shared/ui/card_title.svelte'
  import { currentDocumentLocale } from '@/apps/admin/shared/lib/date_locale'
  import type { CursorPagePagination } from '@/apps/admin/shared/lib/pagination'
  import { useTranslation } from '@/apps/admin/shared/stores/translation.svelte'
  import SimplePagination from '@/apps/admin/modules/reviews/components/simple_pagination.svelte'
  
  interface Review {
    id: string
    reviewer: {
      id: string
      username: string
      email: string
    } | null
    reviewee: {
      id: string
      username: string
    } | null
    reviewed_by: {
      id: string
      username: string
    } | null
    comment: string | null
    flag_type: string
    severity: string
    status: string
    notes: string | null
    created_at: string
    reviewed_at: string | null
  }

  interface Props {
    reviews: Review[]
    pagination: CursorPagePagination
    filters?: {
      search?: string
      after?: string | null
      before?: string | null
      flag_type?: string | null
      severity?: string | null
      status?: string | null
    }
  }

  const { reviews, pagination, filters }: Props = $props()
  const { t } = useTranslation()
  const pageTitle = $derived(t('task.reviews.admin_flagged.title', {}, 'Flagged reviews'))

  function resolveReview(id: string, action: 'confirm' | 'dismiss') {
    router.put(`/admin/reviews/${id}/resolve`, { action }, {
      preserveState: true,
      preserveScroll: true,
    })
  }

  function localizedReviewMeta(keyPrefix: string, value: string): string {
    return t(`${keyPrefix}.${value}`, {}, value)
  }

  function formatReviewDate(value: string): string {
    return new Intl.DateTimeFormat(currentDocumentLocale() === 'vi' ? 'vi-VN' : 'en-US').format(new Date(value))
  }
</script>

  <div class="space-y-6">
    <div>
      <div>
        <p class="font-medium uppercase tracking-wider text-xs text-muted-foreground">{t('task.reviews.admin_flagged.eyebrow', {}, 'Admin / Flagged reviews')}</p>
        <h1 class="text-4xl font-bold tracking-tight">{pageTitle}</h1>
        <p class="mt-2 text-sm text-muted-foreground">{t('task.reviews.admin_flagged.pending_count', { count: pagination.total }, ':count reviews awaiting moderation.')}</p>
      </div>
    </div>

    <Card>
      <CardHeader>
        <CardTitle>{t('task.reviews.admin_flagged.list_title', { count: pagination.total }, 'Moderation reviews (:count)')}</CardTitle>
      </CardHeader>
      <CardContent>
        {#if reviews.length === 0}
          <div class="flex items-center justify-center py-12">
            <div class="text-center max-w-md">
              <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <svg
                  class="h-8 w-8 text-foreground"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h3 class="mb-2 text-lg font-semibold text-foreground">{t('task.reviews.admin_flagged.empty_title', {}, 'No flagged reviews')}</h3>
              <p class="text-muted-foreground">
                {t('task.reviews.admin_flagged.empty_description', {}, 'No reviews need system admin handling right now.')}
              </p>
            </div>
          </div>
      {:else}
        <div class="overflow-x-auto">
            <table class="w-full border-collapse">
              <thead>
                <tr>
                  <th>Review</th>
                  <th>{t('task.reviews.admin_flagged.flag', {}, 'Flag')}</th>
                  <th>{t('task.reviews.admin_flagged.status', {}, 'Status')}</th>
                  <th>{t('task.reviews.admin_flagged.time', {}, 'Time')}</th>
                  <th>{t('task.reviews.admin_flagged.actions', {}, 'Actions')}</th>
                </tr>
              </thead>
              <tbody>
                {#each reviews as review}
                  <tr class="text-sm">
                    <td>
                      <div class="font-medium">
                        {review.reviewer?.username ?? t('task.reviews.admin_flagged.unknown', {}, 'Unknown')} → {review.reviewee?.username ?? t('task.reviews.admin_flagged.unknown', {}, 'Unknown')}
                      </div>
                      <div class="mt-1 text-xs text-muted-foreground">
                        {review.comment ?? t('task.reviews.admin_flagged.no_comment', {}, 'No comment')}
                      </div>
                    </td>
                    <td>
                      <div class="flex items-center gap-2">
                        <Badge variant="outline">{localizedReviewMeta('task.reviews.anomaly_type', review.flag_type)}</Badge>
                        <Badge variant="secondary">{localizedReviewMeta('task.reviews.severity', review.severity)}</Badge>
                      </div>
                    </td>
                    <td>
                      <Badge variant={review.status === 'pending' ? 'secondary' : 'outline'}>
                        {localizedReviewMeta('task.reviews.flagged_status', review.status)}
                      </Badge>
                    </td>
                    <td class="text-muted-foreground">{formatReviewDate(review.created_at)}</td>
                    <td>
                      <div class="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onclick={() => {
                            router.visit(`/admin/reviews/${review.id}`)
                          }}
                        >
                          {t('task.reviews.admin_flagged.view_detail', {}, 'View detail')}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={review.status !== 'pending'}
                          onclick={() => { resolveReview(review.id, 'confirm'); }}
                        >
                          {t('task.reviews.admin_flagged.confirm', {}, 'Confirm')}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={review.status !== 'pending'}
                          onclick={() => { resolveReview(review.id, 'dismiss'); }}
                        >
                          {t('task.reviews.admin_flagged.dismiss', {}, 'Dismiss flag')}
                        </Button>
                      </div>
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
        </div>
        <SimplePagination
          {pagination}
          baseUrl="/admin/reviews"
          extraParams={{
            search: filters?.search ?? undefined,
            status: filters?.status ?? undefined,
            flag_type: filters?.flag_type ?? undefined,
            severity: filters?.severity ?? undefined,
          }}
        />
      {/if}
    </CardContent>
  </Card>
  </div>
