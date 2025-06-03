<script lang="ts">
  /**
   * My Reviews Page — GET /my-reviews
   * Shows the current user's review history, grouped by status.
   */
  import AppLayout from '@/layouts/app_layout.svelte'
  import { router } from '@inertiajs/svelte'
  import { useTranslation } from '@/stores/translation.svelte'
  import ReviewCard from './components/review_card.svelte'
  import ReviewStatusBadge from './components/review_status_badge.svelte'
  import SimplePagination from './components/simple_pagination.svelte'
  import Tabs from '@/components/ui/tabs.svelte'
  import TabsContent from '@/components/ui/tabs_content.svelte'
  import TabsList from '@/components/ui/tabs_list.svelte'
  import TabsTrigger from '@/components/ui/tabs_trigger.svelte'
  import { FileSearch } from 'lucide-svelte'
  import type { MyReviewsProps, SerializedReviewSession, ReviewSessionStatus } from './types.svelte'

  interface Props {
    reviews: MyReviewsProps['reviews']
    meta: MyReviewsProps['meta']
  }

  const { reviews, meta }: Props = $props()
  const { t } = useTranslation()

  const pageTitle = $derived(t('review.my_reviews', {}, 'Đánh giá của tôi'))

  let activeTab = $state<'all' | ReviewSessionStatus>('all')

  const filteredReviews = $derived(
    activeTab === 'all'
      ? reviews
      : reviews.filter((r) => r.status === activeTab)
  )

  // Count per status
  const statusCounts = $derived({
    all: reviews.length,
    completed: reviews.filter((r) => r.status === 'completed').length,
    disputed: reviews.filter((r) => r.status === 'disputed').length,
    pending: reviews.filter((r) => r.status === 'pending').length,
    in_progress: reviews.filter((r) => r.status === 'in_progress').length,
  })

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

    <!-- Status filter tabs -->
    <Tabs value={activeTab} onValueChange={(v) => { activeTab = v as typeof activeTab }}>
      <TabsList>
        <TabsTrigger value="all">
          Tất cả ({statusCounts.all})
        </TabsTrigger>
        <TabsTrigger value="completed">
          Hoàn thành ({statusCounts.completed})
        </TabsTrigger>
        <TabsTrigger value="disputed">
          Tranh chấp ({statusCounts.disputed})
        </TabsTrigger>
        <TabsTrigger value="pending">
          Chờ ({statusCounts.pending})
        </TabsTrigger>
        <TabsTrigger value="in_progress">
          Đang xử lý ({statusCounts.in_progress})
        </TabsTrigger>
      </TabsList>

      <TabsContent value={activeTab}>
        {#if filteredReviews.length === 0}
          <div class="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
            <FileSearch class="h-12 w-12 mb-4 opacity-50" />
            <p class="text-lg font-medium">Không có đánh giá nào</p>
            <p class="text-sm mt-1">
              {activeTab === 'all'
                ? 'Bạn chưa có phiên đánh giá nào'
                : `Không có đánh giá nào ở trạng thái này`}
            </p>
          </div>
        {:else}
          <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-4">
            {#each filteredReviews as review (review.id)}
              <ReviewCard {review} showReviewee={false} onClick={handleReviewClick} />
            {/each}
          </div>
        {/if}
      </TabsContent>
    </Tabs>

    <SimplePagination {meta} baseUrl="/my-reviews" />
  </div>
</AppLayout>
