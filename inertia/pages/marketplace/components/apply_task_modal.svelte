<script lang="ts">
  /**
   * ApplyTaskModal — dialog for applying to a marketplace task.
   * Posts to /api/tasks/:taskId/apply
   */
  import Dialog from '@/components/ui/dialog.svelte'
  import DialogContent from '@/components/ui/dialog_content.svelte'
  import DialogHeader from '@/components/ui/dialog_header.svelte'
  import DialogFooter from '@/components/ui/dialog_footer.svelte'
  import DialogTitle from '@/components/ui/dialog_title.svelte'
  import DialogDescription from '@/components/ui/dialog_description.svelte'
  import Button from '@/components/ui/button.svelte'
  import Input from '@/components/ui/input.svelte'
  import Textarea from '@/components/ui/textarea.svelte'
  import Label from '@/components/ui/label.svelte'
  import { router } from '@inertiajs/svelte'
  import type { MarketplaceTask } from '../types.svelte'

  interface Props {
    task: MarketplaceTask | null
    open: boolean
    onOpenChange?: (open: boolean) => void
  }

  const props: Props = $props()

  interface ApplyTaskResponse {
    success?: boolean
    message?: string
  }

  let message = $state('')
  let expectedRate = $state('')
  let portfolioLinks = $state('')
  let submitting = $state(false)
  let error = $state('')

  function resetForm() {
    message = ''
    expectedRate = ''
    portfolioLinks = ''
    error = ''
    submitting = false
  }

  function handleOpenChange(value: boolean) {
    props.onOpenChange?.(value)
    if (!value) {
      resetForm()
    }
  }

  async function handleSubmit() {
    if (!props.task) return
    submitting = true
    error = ''

    const links = portfolioLinks
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)

    try {
      const response = await fetch(`/api/tasks/${props.task.id}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: message || undefined,
          expected_rate: expectedRate ? Number(expectedRate) : undefined,
          portfolio_links: links.length > 0 ? links : undefined,
          application_source: 'public_listing',
        }),
      })

      const data = (await response.json()) as ApplyTaskResponse

      if (!response.ok || !data.success) {
        error = data.message ?? 'Không thể gửi đơn ứng tuyển'
        return
      }

      // Success — close dialog and reload page
      handleOpenChange(false)
      router.reload({ preserveScroll: true })
    } catch {
      error = 'Đã xảy ra lỗi mạng. Vui lòng thử lại.'
    } finally {
      submitting = false
    }
  }
</script>

<Dialog bind:open={props.open} onOpenChange={handleOpenChange}>
  <DialogContent class="sm:max-w-md">
    <DialogHeader>
      <DialogTitle>Ứng tuyển nhiệm vụ</DialogTitle>
      <DialogDescription>
        {props.task?.title ?? ''}
      </DialogDescription>
    </DialogHeader>

    <form onsubmit={(e) => { e.preventDefault(); void handleSubmit() }} class="space-y-4">
      <!-- Message -->
      <div class="space-y-2">
        <Label for="apply-message">Lời nhắn (tùy chọn)</Label>
        <Textarea
          id="apply-message"
          placeholder="Giới thiệu bản thân và lý do bạn phù hợp..."
          bind:value={message}
          rows={3}
        />
      </div>

      <!-- Expected rate -->
      <div class="space-y-2">
        <Label for="apply-rate">Mức giá đề xuất (VND, tùy chọn)</Label>
        <Input
          id="apply-rate"
          type="number"
          placeholder="Ví dụ: 5000000"
          bind:value={expectedRate}
        />
      </div>

      <!-- Portfolio links -->
      <div class="space-y-2">
        <Label for="apply-portfolio">Liên kết portfolio (mỗi dòng 1 link)</Label>
        <Textarea
          id="apply-portfolio"
          placeholder="https://github.com/username&#10;https://portfolio.example.com"
          bind:value={portfolioLinks}
          rows={2}
        />
      </div>

      <!-- Error -->
      {#if error}
        <p class="text-sm text-destructive">{error}</p>
      {/if}

      <DialogFooter>
        <Button variant="outline" type="button" onclick={() => { handleOpenChange(false) }}>
          Hủy
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Đang gửi...' : 'Gửi đơn ứng tuyển'}
        </Button>
      </DialogFooter>
    </form>
  </DialogContent>
</Dialog>
