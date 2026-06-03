<script lang="ts">
  import OrganizationLayout from '@/layouts/organization_layout.svelte'
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
  <title>Org Reverse Reviews</title>
</svelte:head>

<OrganizationLayout title="Org Reverse Reviews">
  <ReverseReviewList
    title="Organization reverse reviews"
    description="Scoped reverse reviews for assignments inside current organization. Anonymous submissions keep reviewer identity hidden."
    {reviews}
    {stats}
    scope="org"
  />
</OrganizationLayout>
