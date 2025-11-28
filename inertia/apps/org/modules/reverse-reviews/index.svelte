<script lang="ts">
  import ReverseReviewsPage from '@/apps/org/modules/reviews/reverse-reviews.svelte'
  import type { PagePagination } from '@/apps/org/shared/lib/pagination'
  import type { ReverseReviewListItem } from '@/apps/org/modules/reviews/components/reverse_review_list.svelte'

  interface Props {
    reviews: ReverseReviewListItem[]
    pagination: PagePagination
    stats: {
      total: number
      anonymous: number
      byTargetType: Record<string, number>
    }
  }

  const { reviews, pagination, stats }: Props = $props()
</script>

<ReverseReviewsPage {reviews} {pagination} {stats} shellMode="organization" />
