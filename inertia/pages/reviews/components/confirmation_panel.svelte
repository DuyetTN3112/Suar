<script lang="ts">
  /**
   * ConfirmationPanel — allows reviewee to confirm or dispute a review.
   */
  import { router } from '@inertiajs/svelte'
  import Button from '@/components/ui/button.svelte'
  import Textarea from '@/components/ui/textarea.svelte'
  import Label from '@/components/ui/label.svelte'
  import type { ReviewConfirmationAction } from '../types.svelte'

  interface Props {
    sessionId: string
    disabled?: boolean
  }

  const { sessionId, disabled = false }: Props = $props()

  let action = $state<ReviewConfirmationAction | null>(null)
  let disputeReason = $state('')
  let submitting = $state(false)

  const isValid = $derived(
    action !== null && (action === 'confirmed' || disputeReason.trim().length > 0)
  )

  function handleSubmit() {
    if (!isValid || submitting || disabled || !action) return

    submitting = true
    router.post(
      `/reviews/${sessionId}/confirm`,
      {
        action,
        dispute_reason: action === 'disputed' ? disputeReason : undefined,
      },
      {
        preserveScroll: true,
        onFinish: () => { submitting = false },
      }
    )
  }
</script>

<form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} class="space-y-4">
  <div>
    <h3 class="text-sm font-medium mb-3">Xác nhận kết quả đánh giá</h3>
    <p class="text-xs text-muted-foreground mb-4">
      Vui lòng xác nhận hoặc tranh chấp kết quả đánh giá kỹ năng của bạn.
    </p>
  </div>

  <div class="flex gap-3">
    <Button
      type="button"
      variant={action === 'confirmed' ? 'default' : 'outline'}
      onclick={() => { action = 'confirmed' }}
      disabled={disabled}
      class="flex-1"
    >
      ✓ Xác nhận
    </Button>
    <Button
      type="button"
      variant={action === 'disputed' ? 'destructive' : 'outline'}
      onclick={() => { action = 'disputed' }}
      disabled={disabled}
      class="flex-1"
    >
      ✗ Tranh chấp
    </Button>
  </div>

  {#if action === 'disputed'}
    <div class="space-y-2">
      <Label for="dispute-reason">Lý do tranh chấp <span class="text-destructive">*</span></Label>
      <Textarea
        id="dispute-reason"
        bind:value={disputeReason}
        placeholder="Mô tả lý do bạn không đồng ý với kết quả đánh giá..."
        rows={3}
        disabled={disabled}
      />
    </div>
  {/if}

  <Button type="submit" disabled={!isValid || submitting || disabled} class="w-full">
    {#if submitting}
      Đang xử lý...
    {:else if action === 'confirmed'}
      Gửi xác nhận
    {:else if action === 'disputed'}
      Gửi tranh chấp
    {:else}
      Chọn hành động
    {/if}
  </Button>
</form>
