<script lang="ts">
  /**
   * ApplyTaskModal — dialog for applying to a marketplace task.
   * Posts to /api/tasks/:taskId/apply
   */
  import { router } from '@inertiajs/svelte'
  import axios from 'axios'

  import Button from '@/components/ui/button.svelte'
  import Dialog from '@/components/ui/dialog.svelte'
  import DialogContent from '@/components/ui/dialog_content.svelte'
  import DialogDescription from '@/components/ui/dialog_description.svelte'
  import DialogFooter from '@/components/ui/dialog_footer.svelte'
  import DialogHeader from '@/components/ui/dialog_header.svelte'
  import DialogTitle from '@/components/ui/dialog_title.svelte'
  import Label from '@/components/ui/label.svelte'
  import Textarea from '@/components/ui/textarea.svelte'


  import type { MarketplaceTask } from '../types.svelte'

  interface Props {
    task: MarketplaceTask | null
    open: boolean
    onOpenChange?: (open: boolean) => void
  }

  // eslint-disable-next-line prefer-const
  let { task, open = $bindable(false), onOpenChange }: Props = $props()

  interface ApplyTaskResponse {
    success?: boolean
    message?: string
  }

  let message = $state('')
  let portfolioLinks = $state('')
  let submitting = $state(false)
  let error = $state('')

  function resetForm() {
    message = ''
    portfolioLinks = ''
    error = ''
    submitting = false
  }

  function handleOpenChange(value: boolean) {
    onOpenChange?.(value)
    if (!value) {
      resetForm()
    }
  }

  async function handleSubmit() {
    if (!task) return
    submitting = true
    error = ''

    const links = portfolioLinks
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)

    try {
      const response = await axios.post<ApplyTaskResponse>(
        `/api/tasks/${task.id}/apply`,
        {
          message: message || undefined,
          portfolio_links: links.length > 0 ? links : undefined,
          application_source: 'public_listing',
        },
        {
          headers: {
            Accept: 'application/json',
          },
        }
      )

      if (!response.data.success) {
        error = response.data.message ?? 'Không thể gửi đơn ứng tuyển'
        return
      }

      // Success — close dialog and reload page
      handleOpenChange(false)
      router.reload()
    } catch (caughtError: unknown) {
      const responseData = (caughtError as {
        response?: {
          status?: number
          data?: { message?: string }
        }
      }).response

      error =
        responseData?.status === 419
          ? 'Phiên bảo mật đã hết hạn. Vui lòng tải lại trang rồi thử lại.'
          : responseData?.data?.message ?? 'Đã xảy ra lỗi mạng. Vui lòng thử lại.'
    } finally {
      submitting = false
    }
  }
</script>

<Dialog bind:open onOpenChange={handleOpenChange}>
  <DialogContent class="sm:max-w-md">
    <DialogHeader>
      <DialogTitle>Ứng tuyển nhiệm vụ</DialogTitle>
      <DialogDescription>
        {task?.title ?? ''}
      </DialogDescription>
    </DialogHeader>

    <form onsubmit={(e) => { e.preventDefault(); void handleSubmit() }} class="space-y-4">
      <!-- Message -->
      <div class="space-y-2">
        <Label for="apply-message">Lời nhắn (tùy chọn)</Label>
        <Textarea
          id="apply-message"
          placeholder="Giới thiệu bản thân và lý do bạn phù hợp..."
          value={message}
          oninput={(event: Event) => {
            message = (event.currentTarget as HTMLTextAreaElement).value
          }}
          rows={3}
        />
      </div>

      <!-- Portfolio links -->
      <div class="space-y-2">
        <Label for="apply-portfolio">Liên kết portfolio (mỗi dòng 1 link)</Label>
        <Textarea
          id="apply-portfolio"
          placeholder="https://github.com/username&#10;https://portfolio.example.com"
          value={portfolioLinks}
          oninput={(event: Event) => {
            portfolioLinks = (event.currentTarget as HTMLTextAreaElement).value
          }}
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
