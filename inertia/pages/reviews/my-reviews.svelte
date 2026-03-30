<script lang="ts">
  /**
   * My Reviews Page — GET /my-reviews
   * Shows the current user's review history, grouped by status.
   */
  import AppLayout from '@/layouts/app_layout.svelte'
  import { router } from '@inertiajs/svelte'
  import { useTranslation } from '@/stores/translation.svelte'
  import ReviewCard from './components/review_card.svelte'
  import SimplePagination from './components/simple_pagination.svelte'
  import { FileSearch } from 'lucide-svelte'
  import type { MyReviewsProps, SerializedReviewSession } from './types.svelte'

  interface Props {
    reviews: MyReviewsProps['reviews']
    meta: MyReviewsProps['meta']
  }

  const { reviews, meta }: Props = $props()
  const { t } = useTranslation()

  const pageTitle = $derived(t('review.my_reviews', {}, 'Đánh giá của tôi'))

  const groupedReviews = $derived(() => {
    const inReview = reviews.filter((r) => {
      if (r.status === 'disputed') return false
      if (r.status === 'pending' || r.status === 'in_progress') return true

      const confirmations = r.confirmations ?? []
      const revieweeConfirmation = confirmations.find((entry) => entry.user_id === r.reviewee_id)
      return revieweeConfirmation?.action !== 'confirmed'
    })

    const done = reviews.filter((r) => {
      if (r.status !== 'completed') return false
      const confirmations = r.confirmations ?? []
      const revieweeConfirmation = confirmations.find((entry) => entry.user_id === r.reviewee_id)
      return revieweeConfirmation?.action === 'confirmed'
    })

    const disputed = reviews.filter((r) => {
      if (r.status === 'disputed') return true
      const confirmations = r.confirmations ?? []
      return confirmations.some((entry) => entry.action === 'disputed')
    })

    return {
      inReview,
      done,
      disputed,
    }
  })

  const boardColumns = $derived(
    [
      {
        key: 'inReview',
        title: 'In review',
        subtitle: 'Đang chờ review/xác nhận',
        items: groupedReviews().inReview,
        headerClass: 'border-t-blue-500 bg-blue-50/70',
      },
      {
        key: 'done',
        title: 'Done',
        subtitle: 'Đã hoàn tất review',
        items: groupedReviews().done,
        headerClass: 'border-t-emerald-500 bg-emerald-50/70',
      },
      {
        key: 'disputed',
        title: 'Tranh chấp',
        subtitle: 'Cần admin xử lý',
        items: groupedReviews().disputed,
        headerClass: 'border-t-red-500 bg-red-50/70',
      },
    ] as const
  )

  function handleReviewClick(review: SerializedReviewSession) {
    router.get(`/reviews/${review.id}`)
  }
</script>

<svelte:head>
  <title>{pageTitle}</title>
</svelte:head>

<AppLayout title={pageTitle}>
  <div class="p-4 sm:p-6 space-y-6">
    <!-- Header -->
    <div>
      <h1 class="text-xl font-semibold">{pageTitle}</h1>
      <p class="text-sm text-muted-foreground mt-1">
        Lịch sử các phiên đánh giá kỹ năng của bạn
      </p>
    </div>

    {#if reviews.length === 0}
      <div class="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
        <FileSearch class="h-12 w-12 mb-4 opacity-50" />
        <p class="text-lg font-medium">Không có phiên review nào</p>
        <p class="text-sm mt-1">Các task hoàn thành sẽ xuất hiện ở đây để đánh giá</p>
      </div>
    {:else}
      <div class="w-full overflow-x-auto pb-2">
        <div class="flex items-start gap-4 min-w-[980px]">
          {#each boardColumns as column (column.key)}
            <section class="flex min-w-[320px] max-w-[420px] flex-1 flex-col rounded-lg border border-t-4 bg-muted/20">
              <header class="px-3 py-2.5 {column.headerClass}">
                <div class="flex items-center justify-between gap-2">
                  <h3 class="text-sm font-semibold">{column.title}</h3>
                  <span class="inline-flex items-center rounded-full bg-background px-2 py-0.5 text-xs font-semibold">
                    {column.items.length}
                  </span>
                </div>
                <p class="text-xs text-muted-foreground mt-1">{column.subtitle}</p>
              </header>

              <div class="max-h-[calc(100vh-320px)] space-y-3 overflow-y-auto p-3">
                {#if column.items.length === 0}
                  <div class="flex h-20 items-center justify-center rounded-md border-2 border-dashed border-muted-foreground/25 text-xs text-muted-foreground">
                    Chưa có item
                  </div>
                {:else}
                  {#each column.items as review (review.id)}
                    <ReviewCard {review} showReviewee={false} onClick={handleReviewClick} />
                  {/each}
                {/if}
              </div>
            </section>
          {/each}
        </div>
      </div>
    {/if}

    <SimplePagination {meta} baseUrl="/my-reviews" />
  </div>
</AppLayout>
