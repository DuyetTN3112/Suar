<script lang="ts">
  /**
   * ReviewCard — displays a review session summary in a card layout.
   * Used in pending.svelte and my-reviews.svelte.
   */
  import { ClipboardCheck, User, Calendar } from 'lucide-svelte'

  import type { SerializedReviewSession } from '../types.svelte'

  import ReviewStatusBadge from './review_status_badge.svelte'

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

  const createdDate = $derived.by(() => {
    if (!review.created_at) return 'Chưa có ngày'
    const parsed = new Date(review.created_at)
    if (Number.isNaN(parsed.getTime())) return 'Chưa có ngày'
    return parsed.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  })

  const peerReviewsCount = $derived(review.peer_reviews_count)
  const requiredPeerReviews = $derived(review.required_peer_reviews)
  const managerReviewCompleted = $derived(review.manager_review_completed)
  const peerProgress = $derived(
    `${peerReviewsCount}/${requiredPeerReviews}`
  )

  function handleClick() {
    onClick?.(review)
  }

</script>

<button
  type="button"
  class="bg-white border border-border rounded-xl p-4 shadow-xs"
  onclick={handleClick}
>
  <div class="review-card-head">
      <h3>{taskTitle}</h3>
      <ReviewStatusBadge status={review.status} />
  </div>
  <div class="review-card-meta">
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
        Manager: {managerReviewCompleted ? '✓' : '✗'}
        · Peer: {peerProgress}
      </span>
    </div>
  </div>
</button>
