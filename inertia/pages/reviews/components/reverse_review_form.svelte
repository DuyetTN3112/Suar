<script lang="ts">
  /**
   * Reverse Review Form — allows reviewee to rate their reviewers
   */
  import { router } from '@inertiajs/svelte'
  import Card from '@/components/ui/card.svelte'
  import CardContent from '@/components/ui/card_content.svelte'
  import CardHeader from '@/components/ui/card_header.svelte'
  import CardTitle from '@/components/ui/card_title.svelte'
  import { Star } from 'lucide-svelte'
  import type { ReverseReviewTargetType } from '../types.svelte'
  import { REVERSE_REVIEW_TARGET_CONFIG } from '../types.svelte'

  interface ReviewerTarget {
    id: string
    username: string
    type: ReverseReviewTargetType
  }

  interface Props {
    sessionId: string
    reviewers: ReviewerTarget[]
  }

  const { sessionId, reviewers }: Props = $props()

  let selectedTarget = $state<ReviewerTarget | null>(null)
  let rating = $state(0)
  let hoverRating = $state(0)
  let comment = $state('')
  let isAnonymous = $state(false)
  let submitting = $state(false)

  function selectTarget(target: ReviewerTarget) {
    selectedTarget = target
    rating = 0
    comment = ''
  }

  function submitReverse() {
    if (!selectedTarget || rating === 0) return

    submitting = true
    router.post(
      `/reviews/${sessionId}/reverse`,
      {
        target_type: selectedTarget.type,
        target_id: selectedTarget.id,
        rating,
        comment: comment || null,
        is_anonymous: isAnonymous,
      },
      {
        preserveState: true,
        preserveScroll: true,
        onFinish: () => {
          submitting = false
          selectedTarget = null
          rating = 0
          comment = ''
        },
      }
    )
  }
</script>

<Card>
  <CardHeader>
    <CardTitle class="text-base">Đánh giá ngược</CardTitle>
    <p class="text-sm text-muted-foreground">
      Đánh giá người đã review bạn (phản hồi 360°)
    </p>
  </CardHeader>
  <CardContent>
    {#if reviewers.length === 0}
      <p class="text-sm text-muted-foreground">Chưa có reviewer nào để đánh giá ngược.</p>
    {:else}
      <!-- Reviewer list -->
      <div class="space-y-2 mb-4">
        <p class="text-sm font-medium">Chọn người cần đánh giá:</p>
        {#each reviewers as reviewer}
          <button
            type="button"
              class="w-full text-left rounded-lg border p-3 transition-colors hover:bg-accent/50
              {selectedTarget &&
              selectedTarget.id === reviewer.id &&
              selectedTarget.type === reviewer.type
                ? 'border-primary bg-accent'
                : 'border-border'}"
            onclick={() => { selectTarget(reviewer); }}
          >
            <div class="flex items-center justify-between">
              <span class="font-medium">{reviewer.username}</span>
              <span class="text-xs text-muted-foreground">
                {REVERSE_REVIEW_TARGET_CONFIG[reviewer.type].labelVi}
              </span>
            </div>
          </button>
        {/each}
      </div>

      <!-- Rating form (shown when target selected) -->
      {#if selectedTarget}
        <div class="space-y-4 border-t pt-4">
          <div>
            <p class="text-sm font-medium mb-2">Đánh giá cho {selectedTarget.username}:</p>
            <div class="flex gap-1">
              {#each [1, 2, 3, 4, 5] as star}
                <button
                  type="button"
                  class="p-0.5 transition-colors"
                  onmouseenter={() => (hoverRating = star)}
                  onmouseleave={() => (hoverRating = 0)}
                  onclick={() => (rating = star)}
                >
                  <Star
                    class="h-6 w-6 {(hoverRating || rating) >= star
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-muted-foreground'}"
                  />
                </button>
              {/each}
              {#if rating > 0}
                <span class="ml-2 text-sm text-muted-foreground">{rating}/5</span>
              {/if}
            </div>
          </div>

          <div>
            <label for="reverse-comment" class="text-sm font-medium">
              Nhận xét (tùy chọn):
            </label>
            <textarea
              id="reverse-comment"
              bind:value={comment}
              rows="3"
              class="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm
                ring-offset-background placeholder:text-muted-foreground
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Nhận xét về quá trình đánh giá..."
            ></textarea>
          </div>

          <label class="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              bind:checked={isAnonymous}
              class="rounded border-input"
            />
            Gửi ẩn danh
          </label>

          <button
            type="button"
            onclick={submitReverse}
            disabled={rating === 0 || submitting}
            class="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm
              font-medium text-primary-foreground ring-offset-background transition-colors
              hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2
              focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
          >
            {submitting ? 'Đang gửi...' : 'Gửi đánh giá ngược'}
          </button>
        </div>
      {/if}
    {/if}
  </CardContent>
</Card>
