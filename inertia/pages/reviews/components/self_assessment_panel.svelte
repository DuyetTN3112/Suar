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

  import type { TaskSelfAssessment } from '../types.svelte'

  interface Props {
    sessionId: string
    canEdit: boolean
  }

  const { sessionId, canEdit }: Props = $props()

  const difficultyOptions = [
    { value: 'easier_than_expected', label: 'Dễ hơn dự kiến' },
    { value: 'as_expected', label: 'Đúng như dự kiến' },
    { value: 'harder_than_expected', label: 'Khó hơn dự kiến' },
    { value: 'extremely_challenging', label: 'Rất thách thức' },
  ]

  let loading = $state(true)
  let submitting = $state(false)
  let savedAssessment = $state<TaskSelfAssessment | null>(null)
  let errorMessage = $state('')

  let formData = $state({
    overall_satisfaction: '',
    difficulty_felt: 'as_expected',
    confidence_level: '',
    what_went_well: '',
    what_would_do_different: '',
    blockers_text: '',
    skills_lacking_text: '',
    skills_strong_text: '',
  })

  const parseList = (raw: string) =>
    raw
      .split(/[\n,]/)
      .map((item) => item.trim())
      .filter((item) => item.length > 0)

  const parseNumeric = (raw: string) => {
    const value = Number(raw)
    return Number.isFinite(value) ? value : undefined
  }

  function applyAssessment(assessment: TaskSelfAssessment | null) {
    savedAssessment = assessment

    if (!assessment) {
      return
    }

    formData = {
      overall_satisfaction:
        assessment.overall_satisfaction != null ? String(assessment.overall_satisfaction) : '',
      difficulty_felt: assessment.difficulty_felt ?? 'as_expected',
      confidence_level: assessment.confidence_level != null ? String(assessment.confidence_level) : '',
      what_went_well: assessment.what_went_well ?? '',
      what_would_do_different: assessment.what_would_do_different ?? '',
      blockers_text: assessment.blockers_encountered.join('\n'),
      skills_lacking_text: assessment.skills_felt_lacking.join('\n'),
      skills_strong_text: assessment.skills_felt_strong.join('\n'),
    }
  }

  async function loadAssessment() {
    loading = true
    errorMessage = ''

    try {
      const response = await axios.get<{ success: boolean; data: TaskSelfAssessment | null }>(
        `/reviews/${sessionId}/self-assessment`
      )
      applyAssessment(response.data.data)
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { message?: string } } }).response?.data?.message
      errorMessage = message ?? 'Không thể tải tự đánh giá.'
    } finally {
      loading = false
    }
  }

  async function handleSubmit() {
    submitting = true
    errorMessage = ''

    try {
      const response = await axios.post<{ success: boolean; data: TaskSelfAssessment }>(
        `/reviews/${sessionId}/self-assessment`,
        {
          overall_satisfaction: parseNumeric(formData.overall_satisfaction),
          difficulty_felt: formData.difficulty_felt,
          confidence_level: parseNumeric(formData.confidence_level),
          what_went_well: formData.what_went_well || undefined,
          what_would_do_different: formData.what_would_do_different || undefined,
          blockers_encountered: parseList(formData.blockers_text),
          skills_felt_lacking: parseList(formData.skills_lacking_text),
          skills_felt_strong: parseList(formData.skills_strong_text),
        }
      )

      applyAssessment(response.data.data)
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { message?: string } } }).response?.data?.message
      errorMessage = message ?? 'Không thể lưu tự đánh giá.'
    } finally {
      submitting = false
    }
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleString('vi-VN')
  }

  onMount(() => {
    void loadAssessment()
  })
</script>

<div class="space-y-4">
  {#if loading}
    <div class="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
      Đang tải tự đánh giá...
    </div>
  {:else}
    {#if savedAssessment}
      <div class="rounded-lg border bg-muted/10 p-4 text-sm">
        <p class="font-semibold">Bản tự đánh giá hiện tại</p>
        <p class="mt-1 text-xs text-muted-foreground">
          Cập nhật lần cuối: {formatDate(savedAssessment.updated_at)}
        </p>
      </div>
    {/if}

    <div class="grid gap-4 rounded-lg border p-4">
      <div>
        <h4 class="text-sm font-semibold">Tự đánh giá sau khi hoàn thành task</h4>
        <p class="text-xs text-muted-foreground">
          Mục này dùng để so sánh cảm nhận của người làm với đánh giá từ reviewer.
        </p>
      </div>

      <div class="grid gap-4 md:grid-cols-2">
        <div class="space-y-2">
          <Label for="overall_satisfaction">Mức độ hài lòng tổng thể (1-5)</Label>
          <Input
            id="overall_satisfaction"
            type="number"
            min="1"
            max="5"
            step="1"
            bind:value={formData.overall_satisfaction}
            disabled={!canEdit || submitting}
          />
        </div>

        <div class="space-y-2">
          <Label for="confidence_level">Mức độ tự tin (1-5)</Label>
          <Input
            id="confidence_level"
            type="number"
            min="1"
            max="5"
            step="1"
            bind:value={formData.confidence_level}
            disabled={!canEdit || submitting}
          />
        </div>
      </div>

      <div class="space-y-2">
        <Label for="difficulty_felt">Cảm nhận độ khó</Label>
        <Select
          value={formData.difficulty_felt}
          onValueChange={(value: string) => {
            formData.difficulty_felt = value
          }}
        >
          <SelectTrigger disabled={!canEdit || submitting}>
            <span>{difficultyOptions.find((option) => option.value === formData.difficulty_felt)?.label ?? 'Chọn cảm nhận độ khó'}</span>
          </SelectTrigger>
          <SelectContent>
            {#each difficultyOptions as option (option.value)}
              <SelectItem value={option.value} label={option.label}>
                {option.label}
              </SelectItem>
            {/each}
          </SelectContent>
        </Select>
      </div>

      <div class="space-y-2">
        <Label for="what_went_well">Điều đã làm tốt</Label>
        <Textarea
          id="what_went_well"
          bind:value={formData.what_went_well}
          rows={3}
          disabled={!canEdit || submitting}
        />
      </div>

      <div class="space-y-2">
        <Label for="what_would_do_different">Nếu làm lại, bạn sẽ làm khác đi điều gì?</Label>
        <Textarea
          id="what_would_do_different"
          bind:value={formData.what_would_do_different}
          rows={3}
          disabled={!canEdit || submitting}
        />
      </div>

      <div class="grid gap-4 md:grid-cols-3">
        <div class="space-y-2">
          <Label for="blockers_text">Blockers đã gặp</Label>
          <Textarea
            id="blockers_text"
            bind:value={formData.blockers_text}
            rows={4}
            placeholder="Mỗi dòng là một blocker"
            disabled={!canEdit || submitting}
          />
        </div>

        <div class="space-y-2">
          <Label for="skills_lacking_text">Kỹ năng còn thiếu</Label>
          <Textarea
            id="skills_lacking_text"
            bind:value={formData.skills_lacking_text}
            rows={4}
            placeholder="Mỗi dòng là một kỹ năng"
            disabled={!canEdit || submitting}
          />
        </div>

        <div class="space-y-2">
          <Label for="skills_strong_text">Kỹ năng cảm thấy mạnh</Label>
          <Textarea
            id="skills_strong_text"
            bind:value={formData.skills_strong_text}
            rows={4}
            placeholder="Mỗi dòng là một kỹ năng"
            disabled={!canEdit || submitting}
          />
        </div>
      </div>

      {#if errorMessage}
        <p class="text-sm text-destructive">{errorMessage}</p>
      {/if}

      {#if canEdit}
        <div class="flex justify-end">
          <Button onclick={() => { void handleSubmit() }} disabled={submitting}>
            {submitting ? 'Đang lưu...' : savedAssessment ? 'Cập nhật tự đánh giá' : 'Lưu tự đánh giá'}
          </Button>
        </div>
      {:else}
        <p class="text-sm text-muted-foreground">
          Chỉ người được review mới có thể cập nhật phần tự đánh giá này.
        </p>
      {/if}
    </div>
  {/if}
</div>
