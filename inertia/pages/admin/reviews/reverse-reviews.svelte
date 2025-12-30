<script lang="ts">
  import ReverseReviewList, { type ReverseReviewListItem } from '@/pages/reviews/components/reverse_review_list.svelte'

  interface Props {
    reviews: ReverseReviewListItem[]
    stats: {
      total: number
      anonymous: number
      by_target_type: Record<string, number>
    }
  }

  const { reviews, stats }: Props = $props()
</script>

<svelte:head>
  <title>Admin Reverse Reviews</title>
</svelte:head>

<ReverseReviewList
  title="Admin reverse reviews"
  description="System-wide reverse review read surface. Admin scope can inspect anonymous reviewer identity for investigations."
  {reviews}
  {stats}
  scope="admin"
/>
