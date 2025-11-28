<script lang="ts">
  import axios from 'axios'
  import { onMount } from 'svelte'

  import Button from '@/apps/org/shared/ui/button.svelte'
  import Input from '@/apps/org/shared/ui/input.svelte'
  import Label from '@/apps/org/shared/ui/label.svelte'
  import Select from '@/apps/org/shared/ui/select.svelte'
  import SelectContent from '@/apps/org/shared/ui/select_content.svelte'
  import SelectItem from '@/apps/org/shared/ui/select_item.svelte'
  import SelectTrigger from '@/apps/org/shared/ui/select_trigger.svelte'
  import Textarea from '@/apps/org/shared/ui/textarea.svelte'
  import UnifiedOffsetPagination from '@/apps/org/shared/ui/unified_offset_pagination.svelte'
  import { currentDocumentLocale } from '@/apps/org/shared/lib/date_locale'
  import type { OffsetPagePagination } from '@/apps/org/shared/lib/pagination'
  import { useTranslation } from '@/apps/org/shared/stores/translation.svelte'

  import ReviewRelatedTaskCommentsPanel from './review_related_task_comments_panel.svelte'
  import type { ReviewEvidenceItem, ReviewRelatedTaskComment } from '../types.svelte'

  interface Props {
    sessionId: string
    taskId: string | null
    initialTaskComments?: ReviewRelatedTaskComment[]
  }

  const { sessionId, taskId, initialTaskComments = [] }: Props = $props()
  const { t } = useTranslation()
  const documentLocale = $derived(currentDocumentLocale() === 'vi' ? 'vi-VN' : 'en-US')

  const evidenceTypeOptions = [
    { value: 'pull_request', fallback: 'Pull request' },
    { value: 'commit_link', fallback: 'Commit link' },
    { value: 'demo_recording', fallback: 'Demo video' },
    { value: 'test_report', fallback: 'Test report' },
    { value: 'document_link', fallback: 'Document' },
    { value: 'ticket', fallback: 'Ticket' },
    { value: 'screenshot', fallback: 'Screenshot' },
    { value: 'metrics_screenshot', fallback: 'Metrics screenshot' },
    { value: 'other', fallback: 'Other' },
  ]

  let evidences = $state<ReviewEvidenceItem[]>([])
  let pagination = $state<OffsetPagePagination | null>(null)
  let loading = $state(true)
  let submitting = $state(false)
  let errorMessage = $state('')

  let formData = $state({
    evidence_type: 'pull_request',
    url: '',
    title: '',
    description: '',
  })

  async function loadEvidences(page = pagination?.page ?? 1) {
    loading = true
    errorMessage = ''

    try {
      const response = await axios.get<{
        data: ReviewEvidenceItem[]
        pagination?: OffsetPagePagination
      }>(
        `/reviews/${sessionId}/evidences`,
        { params: { page, perPage: pagination?.perPage ?? 10 } }
      )
      evidences = response.data.data
      pagination = response.data.pagination ?? null
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { message?: string } } }).response?.data?.message
      errorMessage = message ?? t('task.reviews.evidence_panel.load_error', {}, 'Unable to load review evidence.')
    } finally {
      loading = false
    }
  }

  async function handleSubmit() {
    submitting = true
    errorMessage = ''

    try {
      const response = await axios.post<{ data: ReviewEvidenceItem }>(
        `/reviews/${sessionId}/evidences`,
        {
          evidenceType: formData.evidence_type,
          url: formData.url || undefined,
          title: formData.title || undefined,
          description: formData.description || undefined,
        }
      )

      evidences = [response.data.data, ...evidences]
      formData = {
        evidence_type: 'pull_request',
        url: '',
        title: '',
        description: '',
      }
      await loadEvidences(1)
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { message?: string } } }).response?.data?.message
      errorMessage = message ?? t('task.reviews.evidence_panel.add_error', {}, 'Unable to add evidence.')
    } finally {
      submitting = false
    }
  }

  function formatDate(date: string) {
    const parsed = new Date(date)
    if (Number.isNaN(parsed.getTime())) return date
    return new Intl.DateTimeFormat(documentLocale, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(parsed)
  }

  function formatEvidenceTypeLabel(value: string) {
    const option = evidenceTypeOptions.find((item) => item.value === value)
    return option ? getEvidenceTypeLabel(option) : value
  }

  function getEvidenceTypeLabel(option: (typeof evidenceTypeOptions)[number]) {
    return t(`task.reviews.evidence_panel.type.${option.value}`, {}, option.fallback)
  }

  const selectedEvidenceTypeOption = $derived(
    evidenceTypeOptions.find((option) => option.value === formData.evidence_type) ?? null
  )
  const selectedEvidenceTypeLabel = $derived(
    selectedEvidenceTypeOption
      ? getEvidenceTypeLabel(selectedEvidenceTypeOption)
      : t('task.reviews.evidence_panel.type_placeholder', {}, 'Choose evidence type')
  )

  onMount(() => {
    void loadEvidences()
  })
</script>

<div class="space-y-4">
  <ReviewRelatedTaskCommentsPanel
    {taskId}
    initialComments={initialTaskComments}
    mode="all"
    title={t('task.reviews.evidence_panel.task_comments_title', {}, 'Task comments attached to review package')}
    description={t('task.reviews.evidence_panel.task_comments_description', {}, 'This is the task work log attached as context. Scoring feedback, review confirmation, and dispute discussion stay in the dedicated review session or dispute room.')}
  />

  <div class="rounded-lg border bg-muted/10 p-4">
    <div class="mb-4">
      <h4 class="text-sm font-semibold">{t('task.reviews.evidence_panel.add_title', {}, 'Add evidence')}</h4>
    </div>

    <div class="grid gap-4 md:grid-cols-2">
      <div class="space-y-2">
        <Label for="evidence_type">{t('task.reviews.evidence_panel.type_label', {}, 'Evidence type')}</Label>
        <Select
          value={formData.evidence_type}
          onValueChange={(value: string) => {
            formData.evidence_type = value
          }}
        >
          <SelectTrigger>
            <span>{selectedEvidenceTypeLabel}</span>
          </SelectTrigger>
          <SelectContent>
            {#each evidenceTypeOptions as option (option.value)}
              <SelectItem value={option.value} label={getEvidenceTypeLabel(option)}>
                {getEvidenceTypeLabel(option)}
              </SelectItem>
            {/each}
          </SelectContent>
        </Select>
      </div>

      <div class="space-y-2">
        <Label for="evidence_title">{t('task.reviews.evidence_panel.title_label', {}, 'Title')}</Label>
        <Input id="evidence_title" bind:value={formData.title} placeholder={t('task.reviews.evidence_panel.title_placeholder', {}, 'Example: PR fixing review metrics')} />
      </div>
    </div>

    <div class="mt-4 grid gap-4">
      <div class="space-y-2">
        <Label for="evidence_url">URL</Label>
        <Input id="evidence_url" bind:value={formData.url} placeholder="https://..." />
      </div>

      <div class="space-y-2">
        <Label for="evidence_description">{t('task.reviews.evidence_panel.description_label', {}, 'Description')}</Label>
        <Textarea
          id="evidence_description"
          bind:value={formData.description}
          rows={3}
          placeholder={t('task.reviews.evidence_panel.description_placeholder', {}, 'Short note')}
        />
      </div>
    </div>

    {#if errorMessage}
      <p class="mt-3 text-sm text-destructive">{errorMessage}</p>
    {/if}

    <div class="mt-4 flex justify-end">
      <Button onclick={() => { void handleSubmit() }} disabled={submitting}>
        {submitting ? t('task.reviews.evidence_panel.saving', {}, 'Saving...') : t('task.reviews.evidence_panel.save_button', {}, 'Save evidence')}
      </Button>
    </div>
  </div>

  <div class="space-y-3">
    <div class="flex items-center justify-between">
      <h4 class="text-sm font-semibold">{t('task.reviews.evidence_panel.attached_title', {}, 'Attached evidence')}</h4>
      <Button variant="outline" size="sm" onclick={() => { void loadEvidences() }} disabled={loading}>
        {t('task.reviews.evidence_panel.reload', {}, 'Reload')}
      </Button>
    </div>

    {#if loading}
      <div class="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
        {t('task.reviews.evidence_panel.loading', {}, 'Loading evidence...')}
      </div>
    {:else if evidences.length === 0}
      <div class="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
        {t('task.reviews.evidence_panel.empty', {}, 'No evidence yet.')}
      </div>
    {:else}
      <div class="space-y-3">
        {#each evidences as evidence (evidence.id)}
          <article class="rounded-lg border p-4">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p class="text-sm font-semibold">{evidence.title ?? t('task.reviews.evidence_panel.untitled', {}, 'Untitled evidence')}</p>
                <p class="text-xs uppercase tracking-wide text-muted-foreground">
                  {formatEvidenceTypeLabel(evidence.evidenceType)}
                </p>
              </div>
              <span class="text-xs text-muted-foreground">{formatDate(evidence.createdAt)}</span>
            </div>

            {#if evidence.description}
              <p class="mt-2 text-sm text-muted-foreground">{evidence.description}</p>
            {/if}

            {#if evidence.url}
              <a
                class="mt-3 inline-flex text-sm font-medium text-primary hover:underline"
                href={evidence.url}
                target="_blank"
                rel="noreferrer"
              >
                {t('task.reviews.evidence_panel.open_link', {}, 'Open evidence link')}
              </a>
            {/if}
          </article>
        {/each}
      </div>
      {#if pagination}
        <UnifiedOffsetPagination
          {pagination}
          onPageChange={(page: number) => {
            void loadEvidences(page)
          }}
        />
      {/if}
    {/if}
  </div>
</div>
