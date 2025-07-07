<script lang="ts">
  /**
   * Pending Reviews Page — GET /reviews/pending
   * Lists review sessions awaiting the current user's review.
   */
  import { router } from '@inertiajs/svelte'
  import { ClipboardList } from 'lucide-svelte'

  import AppLayout from '@/layouts/app_layout.svelte'
  import { useTranslation } from '@/stores/translation.svelte'

  import ReviewCard from './components/review_card.svelte'
  import SimplePagination from './components/simple_pagination.svelte'
  import type { PendingReviewsProps, SerializedReviewSession } from './types.svelte'

  interface Props {
    reviews: PendingReviewsProps['reviews']
    meta: PendingReviewsProps['meta']
  }

  const { reviews, meta }: Props = $props()
  const { t } = useTranslation()

  const pageTitle = $derived(t('review.pending', {}, 'Đánh giá chờ xử lý'))

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
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-xl font-semibold">{pageTitle}</h1>
        <p class="text-sm text-muted-foreground mt-1">
          Các phiên đánh giá đang chờ bạn thực hiện
        </p>
      </div>
      <div class="text-sm text-muted-foreground">
        {meta.total} phiên đánh giá
      </div>
    </div>

    <!-- Content -->
    {#if reviews.length === 0}
      <div class="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
        <ClipboardList class="h-12 w-12 mb-4 opacity-50" />
        <p class="text-lg font-medium">Không có đánh giá nào chờ xử lý</p>
        <p class="text-sm mt-1">Bạn đã hoàn thành tất cả các đánh giá</p>
      </div>
    {:else}
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {#each reviews as review (review.id)}
          <ReviewCard {review} onClick={handleReviewClick} />
        {/each}
      </div>

      <SimplePagination {meta} baseUrl="/reviews/pending" />
    {/if}
  </div>
</AppLayout>
