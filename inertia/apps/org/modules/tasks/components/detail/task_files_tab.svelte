<script lang="ts">
  import axios from 'axios'
  import { onMount } from 'svelte'
  import Paperclip from 'lucide-svelte/icons/paperclip'
  import Trash2 from 'lucide-svelte/icons/trash-2'
  import Badge from '@/apps/org/shared/ui/badge.svelte'
  import Button from '@/apps/org/shared/ui/button.svelte'
  import Card from '@/apps/org/shared/ui/card.svelte'
  import CardContent from '@/apps/org/shared/ui/card_content.svelte'
  import CardHeader from '@/apps/org/shared/ui/card_header.svelte'
  import CardTitle from '@/apps/org/shared/ui/card_title.svelte'
  import Input from '@/apps/org/shared/ui/input.svelte'
  import Label from '@/apps/org/shared/ui/label.svelte'
  import UnifiedOffsetPagination from '@/apps/org/shared/ui/unified_offset_pagination.svelte'
  import type { OffsetPagePagination } from '@/apps/org/shared/lib/pagination'
  import { useTranslation } from '@/apps/org/shared/stores/translation.svelte'
  import { formatDateTime } from '@/apps/org/modules/tasks/utils/task_formatter.svelte'

  interface Props {
    taskId: string
    currentUserId: string | null
  }

  interface TaskAttachment {
    id: string
    fileName: string
    filePath: string
    fileSize?: number | null
    mimeType?: string | null
    attachmentType: string
    uploadedBy: string
    uploadedByUsername?: string | null
    createdAt: string
  }

  interface TaskCollectionResponse<TItem> {
    data: TItem[]
    pagination?: OffsetPagePagination
  }

  const { taskId, currentUserId }: Props = $props()
  const { t } = useTranslation()

  let attachments = $state<TaskAttachment[]>([])
  let attachmentPagination = $state<OffsetPagePagination | null>(null)
  let loadingAttachments = $state(false)
  let savingAttachment = $state(false)
  let deletingAttachmentId = $state<string | null>(null)
  let detailError = $state('')
  let selectedFile = $state<File | null>(null)

  function handleAttachmentFileChange(event: Event) {
    const input = event.currentTarget
    selectedFile = input instanceof HTMLInputElement ? (input.files?.[0] ?? null) : null
  }
  let attachmentForm = $state({
    fileName: '',
    filePath: '',
    attachmentType: 'reference',
    mimeType: '',
    fileSize: '',
  })

  function formatBytes(size?: number | null): string {
    if (!size || Number.isNaN(size)) return t('task.files_tab.size_unknown', {}, 'N/A')
    if (size < 1024) return `${size} B`
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
    return `${(size / (1024 * 1024)).toFixed(1)} MB`
  }

  async function loadAttachments(page = attachmentPagination?.page ?? 1) {
    loadingAttachments = true
    try {
      const response = await axios.get<TaskCollectionResponse<TaskAttachment>>(
        `/api/v1/tasks/${taskId}/attachments`,
        { params: { page, perPage: attachmentPagination?.perPage ?? 10 } }
      )
      attachments = Array.isArray(response.data.data) ? response.data.data : []
      attachmentPagination = response.data.pagination ?? null
    } catch (error) {
      console.error('Error loading task attachments:', error)
      detailError = t('task.files_tab.load_error', {}, 'Unable to load attachments.')
    } finally {
      loadingAttachments = false
    }
  }

  async function submitAttachment() {
    if (
      savingAttachment ||
      (!selectedFile && (!attachmentForm.fileName.trim() || !attachmentForm.filePath.trim()))
    ) {
      return
    }

    savingAttachment = true
    detailError = ''

    try {
      if (selectedFile) {
        const formData = new FormData()
        formData.append('file', selectedFile)
        formData.append('attachmentType', attachmentForm.attachmentType)

        await axios.post(`/api/v1/tasks/${taskId}/attachments`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        })
      } else {
        await axios.post(`/api/v1/tasks/${taskId}/attachments`, {
          fileName: attachmentForm.fileName.trim(),
          filePath: attachmentForm.filePath.trim(),
          attachmentType: attachmentForm.attachmentType,
          mimeType: attachmentForm.mimeType.trim() || null,
          fileSize: attachmentForm.fileSize.trim() ? Number(attachmentForm.fileSize) : null,
        })
      }
      attachmentForm = {
        fileName: '',
        filePath: '',
        attachmentType: 'reference',
        mimeType: '',
        fileSize: '',
      }
      selectedFile = null
      await loadAttachments(1)
    } catch (error) {
      console.error('Error creating task attachment:', error)
      detailError = t('task.files_tab.create_error', {}, 'Unable to add attachment.')
    } finally {
      savingAttachment = false
    }
  }

  async function removeAttachment(attachmentId: string) {
    deletingAttachmentId = attachmentId
    detailError = ''

    try {
      await axios.delete(`/api/v1/tasks/${taskId}/attachments/${attachmentId}`)
      await loadAttachments()
    } catch (error) {
      console.error('Error deleting task attachment:', error)
      detailError = t('task.files_tab.delete_error', {}, 'Unable to delete attachment.')
    } finally {
      deletingAttachmentId = null
    }
  }

  onMount(async () => {
    await loadAttachments()
  })
</script>

<Card>
  <CardHeader>
    <CardTitle class="flex items-center gap-2">
      <Paperclip class="size-4" />
      {t('task.files_tab.title', {}, 'Attachments')}
    </CardTitle>
  </CardHeader>
  <CardContent class="space-y-4">
    {#if detailError}
      <div class="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
        {detailError}
      </div>
    {/if}

    <div class="grid gap-3 md:grid-cols-2">
      <div class="space-y-2">
        <Label for="attachment-name">{t('task.files_tab.file_name', {}, 'File name')}</Label>
        <Input
          id="attachment-name"
          bind:value={attachmentForm.fileName}
          placeholder="architecture-decision.md"
        />
      </div>
      <div class="space-y-2">
        <Label for="attachment-type">{t('task.files_tab.file_type', {}, 'File type')}</Label>
        <select
          id="attachment-type"
          bind:value={attachmentForm.attachmentType}
          class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="reference">{t('task.files_tab.type.reference', {}, 'reference')}</option>
          <option value="requirement">{t('task.files_tab.type.requirement', {}, 'requirement')}</option>
          <option value="submission">{t('task.files_tab.type.submission', {}, 'submission')}</option>
          <option value="review">{t('task.files_tab.type.review', {}, 'review')}</option>
          <option value="other">{t('task.files_tab.type.other', {}, 'other')}</option>
        </select>
      </div>
      <div class="space-y-2 md:col-span-2">
        <Label for="attachment-file">{t('task.files_tab.upload_file', {}, 'Upload file')}</Label>
        <Input
          id="attachment-file"
          type="file"
          onchange={handleAttachmentFileChange}
        />
        {#if selectedFile}
          <p class="text-xs text-muted-foreground">
            {selectedFile.name} · {formatBytes(selectedFile.size)}
          </p>
        {/if}
      </div>
      <div class="space-y-2 md:col-span-2">
        <Label for="attachment-path">{t('task.files_tab.path', {}, 'Path / URL')}</Label>
        <Input
          id="attachment-path"
          bind:value={attachmentForm.filePath}
          placeholder={t('task.files_tab.path_placeholder', {}, '/uploads/tasks/spec.pdf or https://...')}
        />
      </div>
      <div class="space-y-2">
        <Label for="attachment-mime">{t('task.files_tab.mime_type', {}, 'MIME type')}</Label>
        <Input
          id="attachment-mime"
          bind:value={attachmentForm.mimeType}
          placeholder="application/pdf"
        />
      </div>
      <div class="space-y-2">
        <Label for="attachment-size">{t('task.files_tab.file_size', {}, 'Size in bytes')}</Label>
        <Input
          id="attachment-size"
          bind:value={attachmentForm.fileSize}
          placeholder="4096"
          type="number"
        />
      </div>
    </div>
    <div class="flex justify-end">
      <Button
        onclick={submitAttachment}
        disabled={savingAttachment || (!selectedFile && (!attachmentForm.fileName.trim() || !attachmentForm.filePath.trim()))}
      >
        {savingAttachment
          ? t('task.files_tab.adding', {}, 'Adding...')
          : t('task.files_tab.add', {}, 'Add file')}
      </Button>
    </div>

    {#if loadingAttachments}
      <p class="text-sm text-muted-foreground">{t('task.files_tab.loading', {}, 'Loading files...')}</p>
    {:else if attachments.length === 0}
      <p class="text-sm text-muted-foreground">{t('task.files_tab.empty', {}, 'No files yet.')}</p>
    {:else}
      <div class="space-y-3">
        {#each attachments as attachment (attachment.id)}
          <div class="flex flex-col gap-3 rounded-md border p-4 sm:flex-row sm:items-start sm:justify-between">
            <div class="space-y-2">
              <div class="flex flex-wrap items-center gap-2">
                <a
                  href={attachment.filePath}
                  target="_blank"
                  rel="noreferrer"
                  class="font-bold text-primary hover:underline"
                >
                  {attachment.fileName}
                </a>
                <Badge variant="outline" class="text-[10px] uppercase">{attachment.attachmentType}</Badge>
              </div>
              <div class="text-sm text-muted-foreground">
                {attachment.uploadedByUsername ?? attachment.uploadedBy}
                ·
                {formatDateTime(attachment.createdAt)}
                ·
                {formatBytes(attachment.fileSize)}
              </div>
              {#if attachment.mimeType}
                <div class="text-xs text-muted-foreground">{attachment.mimeType}</div>
              {/if}
            </div>
            {#if currentUserId && attachment.uploadedBy === currentUserId}
              <Button
                variant="ghost"
                size="sm"
                disabled={deletingAttachmentId === attachment.id}
                onclick={() => { void removeAttachment(attachment.id) }}
              >
                <Trash2 class="size-4" />
              </Button>
            {/if}
          </div>
        {/each}
      </div>
      {#if attachmentPagination}
        <UnifiedOffsetPagination
          pagination={attachmentPagination}
          onPageChange={(page: number) => {
            void loadAttachments(page)
          }}
        />
      {/if}
    {/if}
  </CardContent>
</Card>
