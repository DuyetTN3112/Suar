<script lang="ts">
  /**
   * ApplyTaskModal — dialog for requesting to join a marketplace task.
   * Posts to /api/v1/tasks/:taskId/apply
   */
  import { router } from '@inertiajs/svelte'
  import axios from 'axios'
  import { toast } from 'svelte-sonner'

  import Button from '@/apps/org/shared/ui/button.svelte'
  import Dialog from '@/apps/org/shared/ui/dialog.svelte'
  import DialogContent from '@/apps/org/shared/ui/dialog_content.svelte'
  import DialogDescription from '@/apps/org/shared/ui/dialog_description.svelte'
  import DialogFooter from '@/apps/org/shared/ui/dialog_footer.svelte'
  import DialogHeader from '@/apps/org/shared/ui/dialog_header.svelte'
  import DialogTitle from '@/apps/org/shared/ui/dialog_title.svelte'
  import Label from '@/apps/org/shared/ui/label.svelte'
  import Textarea from '@/apps/org/shared/ui/textarea.svelte'
  import { useTranslation } from '@/apps/org/shared/stores/translation.svelte'


  import type { MarketplaceTask } from '../types.svelte'

  interface Props {
    task: MarketplaceTask | null
    open: boolean
    onOpenChange?: (open: boolean) => void
  }

  let { task, open = $bindable(false), onOpenChange }: Props = $props()
  const { t } = useTranslation()

  interface ApplyTaskResponse {
    data?: {
      id?: string
    }
    error?: {
      message?: string
    }
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

  function extractErrorMessage(caughtError: unknown): string | null {
    const responseData = (caughtError as {
      response?: {
        data?: {
          detail?: string
          message?: string
          error?: {
            message?: string
          }
        }
      }
    }).response?.data

    return responseData?.error?.message ?? responseData?.message ?? responseData?.detail ?? null
  }

  function isValidPortfolioUrl(value: string): boolean {
    try {
      const url = new URL(value)
      return url.protocol === 'http:' || url.protocol === 'https:'
    } catch {
      return false
    }
  }

  async function handleSubmit() {
    if (!task) return
    if (submitting) return
    submitting = true
    error = ''

    const links = portfolioLinks
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
    const trimmedMessage = message.trim()

    if (!trimmedMessage && links.length === 0) {
      error = t('task.apply_modal.empty_proposal', {}, 'Add a message or at least one proof link so the task owner can evaluate it.')
      submitting = false
      return
    }

    const invalidLinks = links.filter((link) => !isValidPortfolioUrl(link))
    if (invalidLinks.length > 0) {
      error = t('task.apply_modal.invalid_link', {}, 'Portfolio links must start with http:// or https://')
      submitting = false
      return
    }

    try {
      const response = await axios.post<ApplyTaskResponse>(
        `/api/v1/tasks/${task.id}/apply`,
        {
          message: trimmedMessage || undefined,
          portfolio_links: links.length > 0 ? links : undefined,
          application_source: 'public_listing',
        },
        {
          headers: {
            Accept: 'application/json',
          },
        }
      )

      if (!response.data.data?.id) {
        error = response.data.error?.message ?? t('task.apply_modal.submit_error', {}, 'Unable to send application')
        return
      }

      // Success — close dialog and reload page
      handleOpenChange(false)
      toast.success(t('task.apply_modal.success_title', {}, 'Application sent!'), {
        description: t('task.apply_modal.success_description', {}, 'The task owner will review and respond to your application.'),
      })
      router.reload()
    } catch (caughtError: unknown) {
      const responseData = (caughtError as {
        response?: {
          status?: number
        }
      }).response

      error =
        responseData?.status === 419
          ? t('task.apply_modal.csrf_expired', {}, 'Security session expired. Please reload and try again.')
          : extractErrorMessage(caughtError) ?? t('task.apply_modal.network_error', {}, 'A network error occurred. Please try again.')
    } finally {
      submitting = false
    }
  }
</script>

<Dialog bind:open onOpenChange={handleOpenChange}>
  <DialogContent class="sm:max-w-md">
    <DialogHeader>
      <DialogTitle>{t('task.apply_modal.title', {}, 'Apply to task')}</DialogTitle>
      <DialogDescription>
        {task?.title ?? ''}
      </DialogDescription>
    </DialogHeader>

    <form onsubmit={(e) => { e.preventDefault(); void handleSubmit() }} class="space-y-4">
      <!-- Message -->
      <div class="space-y-2">
        <Label for="apply-message">{t('task.apply_modal.message_label', {}, 'Message or proof link required')}</Label>
        <Textarea
          id="apply-message"
          placeholder={t('task.apply_modal.message_placeholder', {}, 'Introduce yourself and why you are a good fit...')}
          value={message}
          oninput={(event: Event) => {
            message = (event.currentTarget as HTMLTextAreaElement).value
          }}
          rows={3}
        />
      </div>

      <!-- Portfolio links -->
      <div class="space-y-2">
        <Label for="apply-portfolio">{t('task.apply_modal.portfolio_label', {}, 'Portfolio links (one per line)')}</Label>
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
          {t('task.apply_modal.cancel', {}, 'Cancel')}
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? t('task.apply_modal.submitting', {}, 'Sending...') : t('task.apply_modal.submit', {}, 'Send application')}
        </Button>
      </DialogFooter>
    </form>
  </DialogContent>
</Dialog>
