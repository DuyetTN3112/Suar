<script lang="ts">
  /**
   * User Reviews Page — GET /users/:id/reviews
   * Displays another user's review history (public profile view).
   */
  import { router } from '@inertiajs/svelte'
  import { FileSearch } from 'lucide-svelte'

  import AppLayout from '@/apps/user/shared/layouts/app_layout.svelte'
  import { useTranslation } from '@/apps/user/shared/stores/translation.svelte'

  import ReviewCard from './components/review_card.svelte'
  import SimplePagination from './components/simple_pagination.svelte'
  import type { UserReviewsProps, SerializedReviewSession } from './types.svelte'

  interface Props {
    shellMode?: 'app' | 'organization'
    auth?: { user?: { current_organization_role?: string | null } }
    userId: UserReviewsProps['userId']
    reviews: UserReviewsProps['reviews']
    pagination: UserReviewsProps['pagination']
  }

  const { userId, reviews, pagination }: Props = $props()
  
  const { t } = useTranslation()

  const pageTitle = $derived(t('task.reviews.user_reviews.title', {}, 'Review history'))

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
          {t('task.reviews.user_reviews.description', {}, 'Completed skill review sessions')}
        </p>
      </div>
      <div class="text-sm text-muted-foreground">
        {t('task.reviews.user_reviews.count', { count: pagination.total }, ':count reviews')}
      </div>
    </div>

    <!-- Content -->
    {#if reviews.length === 0}
      <div class="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
        <FileSearch class="h-12 w-12 mb-4 opacity-50" />
        <p class="text-lg font-medium">{t('task.reviews.user_reviews.empty_title', {}, 'No reviews yet')}</p>
        <p class="text-sm mt-1">{t('task.reviews.user_reviews.empty_description', {}, 'This user has no review sessions yet.')}</p>
      </div>
    {:else}
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {#each reviews as review (review.id)}
          <ReviewCard {review} showReviewee={false} onClick={handleReviewClick} />
        {/each}
      </div>

      <SimplePagination {pagination} baseUrl={`/users/${userId}/reviews`} />
    {/if}
  </div>
</AppLayout>
