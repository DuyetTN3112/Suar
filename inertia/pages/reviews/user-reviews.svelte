<script lang="ts">
  /**
   * User Reviews Page — GET /users/:id/reviews
   * Displays another user's review history (public profile view).
   */
  import AppLayout from '@/layouts/app_layout.svelte'
  import { router } from '@inertiajs/svelte'
  import { useTranslation } from '@/stores/translation.svelte'
  import ReviewCard from './components/review_card.svelte'
  import SimplePagination from './components/simple_pagination.svelte'
  import { FileSearch } from 'lucide-svelte'
  import type { UserReviewsProps, SerializedReviewSession } from './types.svelte'

  interface Props {
    userId: UserReviewsProps['userId']
    reviews: UserReviewsProps['reviews']
    meta: UserReviewsProps['meta']
  }

  const { userId, reviews, meta }: Props = $props()
  const { t } = useTranslation()

  const pageTitle = $derived(t('review.user_reviews', {}, 'Lịch sử đánh giá'))

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
          Danh sách phiên đánh giá kỹ năng đã hoàn thành
        </p>
      </div>
      <div class="text-sm text-muted-foreground">
        {meta.total} đánh giá
      </div>
    </div>

    <!-- Content -->
    {#if reviews.length === 0}
      <div class="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
        <FileSearch class="h-12 w-12 mb-4 opacity-50" />
        <p class="text-lg font-medium">Chưa có đánh giá nào</p>
        <p class="text-sm mt-1">Người dùng này chưa có phiên đánh giá nào</p>
      </div>
    {:else}
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {#each reviews as review (review.id)}
          <ReviewCard {review} showReviewee={false} onClick={handleReviewClick} />
        {/each}
      </div>

      <SimplePagination {meta} baseUrl="/users/{userId}/reviews" />
    {/if}
  </div>
</AppLayout>
