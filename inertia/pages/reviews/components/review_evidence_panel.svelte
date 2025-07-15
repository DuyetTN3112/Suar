<script lang="ts">
  import axios from 'axios'
  import { onMount } from 'svelte'

  import Button from '@/components/ui/button.svelte'
  import Input from '@/components/ui/input.svelte'
  import Label from '@/components/ui/label.svelte'
  import Select from '@/components/ui/select.svelte'
  import SelectContent from '@/components/ui/select_content.svelte'
  import SelectItem from '@/components/ui/select_item.svelte'
  import SelectTrigger from '@/components/ui/select_trigger.svelte'
  import Textarea from '@/components/ui/textarea.svelte'

  import type { ReviewEvidenceItem } from '../types.svelte'

  interface Props {
    sessionId: string
  }

  const { sessionId }: Props = $props()

  const evidenceTypeOptions = [
    { value: 'pull_request', label: 'Pull request' },
    { value: 'commit_link', label: 'Commit link' },
    { value: 'demo_recording', label: 'Demo recording' },
    { value: 'test_report', label: 'Test report' },
    { value: 'document_link', label: 'Document link' },
    { value: 'ticket', label: 'Ticket' },
    { value: 'screenshot', label: 'Screenshot' },
    { value: 'metrics_screenshot', label: 'Metrics screenshot' },
    { value: 'other', label: 'Other' },
  ]

  let evidences = $state<ReviewEvidenceItem[]>([])
  let loading = $state(true)
  let submitting = $state(false)
  let errorMessage = $state('')

  let formData = $state({
    evidence_type: 'pull_request',
    url: '',
    title: '',
    description: '',
  })

  async function loadEvidences() {
    loading = true
    errorMessage = ''

    try {
      const response = await axios.get<{ success: boolean; data: ReviewEvidenceItem[] }>(
        `/reviews/${sessionId}/evidences`
      )
      evidences = response.data.data
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { message?: string } } }).response?.data?.message
      errorMessage = message ?? 'Không thể tải evidence của review.'
    } finally {
      loading = false
    }
  }

  async function handleSubmit() {
    submitting = true
    errorMessage = ''

    try {
      const response = await axios.post<{ success: boolean; data: ReviewEvidenceItem }>(
        `/reviews/${sessionId}/evidences`,
        {
          evidence_type: formData.evidence_type,
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
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { message?: string } } }).response?.data?.message
      errorMessage = message ?? 'Không thể thêm evidence.'
    } finally {
      submitting = false
    }
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleString('vi-VN')
  }

  onMount(() => {
    void loadEvidences()
  })
</script>

<div class="space-y-4">
  <div class="rounded-lg border bg-muted/10 p-4">
    <div class="mb-4">
      <h4 class="text-sm font-semibold">Thêm evidence</h4>
      <p class="text-xs text-muted-foreground">
        Đính kèm pull request, tài liệu, ảnh chụp hoặc link demo để reviewer/admin có thêm ngữ cảnh.
      </p>
    </div>

    <div class="grid gap-4 md:grid-cols-2">
      <div class="space-y-2">
        <Label for="evidence_type">Loại evidence</Label>
        <Select
          value={formData.evidence_type}
          onValueChange={(value: string) => {
            formData.evidence_type = value
          }}
        >
          <SelectTrigger>
            <span>{evidenceTypeOptions.find((option) => option.value === formData.evidence_type)?.label ?? 'Chọn loại evidence'}</span>
          </SelectTrigger>
          <SelectContent>
            {#each evidenceTypeOptions as option (option.value)}
              <SelectItem value={option.value} label={option.label}>
                {option.label}
              </SelectItem>
            {/each}
          </SelectContent>
        </Select>
      </div>

      <div class="space-y-2">
        <Label for="evidence_title">Tiêu đề</Label>
        <Input id="evidence_title" bind:value={formData.title} placeholder="Ví dụ: PR fix review metrics" />
      </div>
    </div>

    <div class="mt-4 grid gap-4">
      <div class="space-y-2">
        <Label for="evidence_url">URL</Label>
        <Input id="evidence_url" bind:value={formData.url} placeholder="https://..." />
      </div>

      <div class="space-y-2">
        <Label for="evidence_description">Mô tả</Label>
        <Textarea
          id="evidence_description"
          bind:value={formData.description}
          rows={3}
          placeholder="Evidence này chứng minh điều gì, reviewer nên nhìn vào đâu..."
        />
      </div>
    </div>

    {#if errorMessage}
      <p class="mt-3 text-sm text-destructive">{errorMessage}</p>
    {/if}

    <div class="mt-4 flex justify-end">
      <Button onclick={() => { void handleSubmit() }} disabled={submitting}>
        {submitting ? 'Đang lưu...' : 'Lưu evidence'}
      </Button>
    </div>
  </div>

  <div class="space-y-3">
    <div class="flex items-center justify-between">
      <h4 class="text-sm font-semibold">Evidence đã đính kèm</h4>
      <Button variant="outline" size="sm" onclick={() => { void loadEvidences() }} disabled={loading}>
        Tải lại
      </Button>
    </div>

    {#if loading}
      <div class="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
        Đang tải evidence...
      </div>
    {:else if evidences.length === 0}
      <div class="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
        Chưa có evidence nào được đính kèm.
      </div>
    {:else}
      <div class="space-y-3">
        {#each evidences as evidence (evidence.id)}
          <article class="rounded-lg border p-4">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p class="text-sm font-semibold">{evidence.title ?? 'Evidence không có tiêu đề'}</p>
                <p class="text-xs uppercase tracking-wide text-muted-foreground">{evidence.evidence_type}</p>
              </div>
              <span class="text-xs text-muted-foreground">{formatDate(evidence.created_at)}</span>
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
                Mở link evidence
              </a>
            {/if}
          </article>
        {/each}
      </div>
    {/if}
  </div>
</div>
