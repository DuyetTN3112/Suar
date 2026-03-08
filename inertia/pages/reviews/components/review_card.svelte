<script lang="ts">
  /**
   * ReviewCard — displays a review session summary in a card layout.
   * Used in pending.svelte and my-reviews.svelte.
   */
  import Card from '@/components/ui/card.svelte'
  import CardContent from '@/components/ui/card_content.svelte'
  import CardHeader from '@/components/ui/card_header.svelte'
  import CardTitle from '@/components/ui/card_title.svelte'
  import ReviewStatusBadge from './review_status_badge.svelte'
  import { ClipboardCheck, User, Calendar } from 'lucide-svelte'
  import type { SerializedReviewSession } from '../types.svelte'

  interface Props {
    review: SerializedReviewSession
    showReviewee?: boolean
    onClick?: (review: SerializedReviewSession) => void
  }

  const { review, showReviewee = true, onClick }: Props = $props()

  const taskTitle = $derived(
    review.task_assignment?.task?.title ?? 'Nhiệm vụ không xác định'
  )

  const revieweeName = $derived(
    review.reviewee?.username ?? 'N/A'
  )

  const createdDate = $derived(
    new Date(review.created_at).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  )

  const peerProgress = $derived(
    `${review.peer_reviews_count}/${review.required_peer_reviews}`
  )

  function handleClick() {
    onClick?.(review)
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleClick()
    }
  }
</script>

<Card
  class="cursor-pointer hover:shadow-md transition-shadow"
  onclick={handleClick}
  onkeydown={handleKeydown}
  tabindex="0"
  role="button"
>
  <CardHeader class="pb-2">
    <div class="flex items-start justify-between gap-2">
      <CardTitle class="text-sm font-medium line-clamp-2">{taskTitle}</CardTitle>
      <ReviewStatusBadge status={review.status} />
    </div>
  </CardHeader>
  <CardContent class="space-y-2 text-sm text-muted-foreground">
    {#if showReviewee}
      <div class="flex items-center gap-2">
        <User class="h-3.5 w-3.5 shrink-0" />
        <span>Người được đánh giá: <strong class="text-foreground">{revieweeName}</strong></span>
      </div>
    {/if}
    <div class="flex items-center gap-2">
      <Calendar class="h-3.5 w-3.5 shrink-0" />
      <span>{createdDate}</span>
    </div>
    <div class="flex items-center gap-2">
      <ClipboardCheck class="h-3.5 w-3.5 shrink-0" />
      <span>
        Manager: {review.manager_review_completed ? '✓' : '✗'}
        · Peer: {peerProgress}
      </span>
    </div>
  </CardContent>
</Card>
