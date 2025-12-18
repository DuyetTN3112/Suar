<script lang="ts">
  import axios from 'axios'
  import { onMount } from 'svelte'

  import Button from '@/apps/user/shared/ui/button.svelte'
  import Input from '@/apps/user/shared/ui/input.svelte'
  import Label from '@/apps/user/shared/ui/label.svelte'
  import Select from '@/apps/user/shared/ui/select.svelte'
  import SelectContent from '@/apps/user/shared/ui/select_content.svelte'
  import SelectItem from '@/apps/user/shared/ui/select_item.svelte'
  import SelectTrigger from '@/apps/user/shared/ui/select_trigger.svelte'
  import Textarea from '@/apps/user/shared/ui/textarea.svelte'
  import { currentDocumentLocale } from '@/apps/user/shared/lib/date_locale'
  import { useTranslation } from '@/apps/user/shared/stores/translation.svelte'

  import type { TaskSelfAssessment } from '../types.svelte'

  interface Props {
    sessionId: string
    canEdit: boolean
  }

  const { sessionId, canEdit }: Props = $props()
  const { t } = useTranslation()
  const documentLocale = $derived(currentDocumentLocale() === 'vi' ? 'vi-VN' : 'en-US')

  const difficultyOptions = [
    { value: 'easier_than_expected', fallback: 'Easier than expected' },
    { value: 'as_expected', fallback: 'As expected' },
    { value: 'harder_than_expected', fallback: 'Harder than expected' },
    { value: 'extremely_challenging', fallback: 'Extremely challenging' },
  ]

  let loading = $state(true)
  let submitting = $state(false)
  let savedAssessment = $state<TaskSelfAssessment | null>(null)
  let errorMessage = $state('')

  let formData = $state({
    overallSatisfaction: '',
    difficultyFelt: 'as_expected',
    confidenceLevel: '',
    whatWentWell: '',
    whatWouldDoDifferent: '',
    blockersText: '',
    skillsLackingText: '',
    skillsStrongText: '',
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
      overallSatisfaction:
        assessment.overallSatisfaction != null ? String(assessment.overallSatisfaction) : '',
      difficultyFelt: assessment.difficultyFelt ?? 'as_expected',
      confidenceLevel: assessment.confidenceLevel != null ? String(assessment.confidenceLevel) : '',
      whatWentWell: assessment.whatWentWell ?? '',
      whatWouldDoDifferent: assessment.whatWouldDoDifferent ?? '',
      blockersText: assessment.blockersEncountered.join('\n'),
      skillsLackingText: assessment.skillsFeltLacking.join('\n'),
      skillsStrongText: assessment.skillsFeltStrong.join('\n'),
    }
  }

  async function loadAssessment() {
    loading = true
    errorMessage = ''

    try {
      const response = await axios.get<{ data: TaskSelfAssessment | null }>(
        `/reviews/${sessionId}/self-assessment`
      )
      applyAssessment(response.data.data)
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { message?: string } } }).response?.data?.message
      errorMessage = message ?? t('task.reviews.self_assessment.load_error', {}, 'Unable to load self assessment.')
    } finally {
      loading = false
    }
  }

  async function handleSubmit() {
    submitting = true
    errorMessage = ''

    try {
      const response = await axios.post<{ data: TaskSelfAssessment }>(
        `/reviews/${sessionId}/self-assessment`,
        {
          overallSatisfaction: parseNumeric(formData.overallSatisfaction),
          difficultyFelt: formData.difficultyFelt,
          confidenceLevel: parseNumeric(formData.confidenceLevel),
          whatWentWell: formData.whatWentWell || undefined,
          whatWouldDoDifferent: formData.whatWouldDoDifferent || undefined,
          blockersEncountered: parseList(formData.blockersText),
          skillsFeltLacking: parseList(formData.skillsLackingText),
          skillsFeltStrong: parseList(formData.skillsStrongText),
        }
      )

      applyAssessment(response.data.data)
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { message?: string } } }).response?.data?.message
      errorMessage = message ?? t('task.reviews.self_assessment.save_error', {}, 'Unable to save self assessment.')
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

  function getDifficultyLabel(option: (typeof difficultyOptions)[number]) {
    return t(`task.reviews.self_assessment.difficulty.${option.value}`, {}, option.fallback)
  }

  const selectedDifficultyOption = $derived(
    difficultyOptions.find((option) => option.value === formData.difficultyFelt) ?? null
  )
  const selectedDifficultyLabel = $derived(
    selectedDifficultyOption
      ? getDifficultyLabel(selectedDifficultyOption)
      : t('task.reviews.self_assessment.difficulty_placeholder', {}, 'Choose perceived difficulty')
  )

  onMount(() => {
    void loadAssessment()
  })
</script>

<div class="space-y-4">
  {#if loading}
    <div class="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
      {t('task.reviews.self_assessment.loading', {}, 'Loading self assessment...')}
    </div>
  {:else}
    {#if savedAssessment}
      <div class="rounded-lg border bg-muted/10 p-4 text-sm">
        <p class="font-semibold">{t('task.reviews.self_assessment.current_title', {}, 'Current self assessment')}</p>
        <p class="mt-1 text-xs text-muted-foreground">
          {t('task.reviews.self_assessment.updated_at', { date: formatDate(savedAssessment.updatedAt) }, `Last updated: ${formatDate(savedAssessment.updatedAt)}`)}
        </p>
      </div>
    {/if}

    <div class="grid gap-4 rounded-lg border p-4">
      <div>
        <h4 class="text-sm font-semibold">{t('task.reviews.self_assessment.title', {}, 'Self assessment after completing the task')}</h4>
      </div>

      <div class="grid gap-4 md:grid-cols-2">
        <div class="space-y-2">
          <Label for="overall_satisfaction">{t('task.reviews.self_assessment.overall_satisfaction', {}, 'Overall satisfaction (1-5)')}</Label>
          <Input
            id="overall_satisfaction"
            type="number"
            min="1"
            max="5"
            step="1"
            bind:value={formData.overallSatisfaction}
            disabled={!canEdit || submitting}
          />
        </div>

        <div class="space-y-2">
          <Label for="confidence_level">{t('task.reviews.self_assessment.confidence_level', {}, 'Confidence level (1-5)')}</Label>
          <Input
            id="confidence_level"
            type="number"
            min="1"
            max="5"
            step="1"
            bind:value={formData.confidenceLevel}
            disabled={!canEdit || submitting}
          />
        </div>
      </div>

      <div class="space-y-2">
        <Label for="difficulty_felt">{t('task.reviews.self_assessment.difficulty_label', {}, 'Perceived difficulty')}</Label>
        <Select
          value={formData.difficultyFelt}
          onValueChange={(value: string) => {
            formData.difficultyFelt = value
          }}
        >
          <SelectTrigger disabled={!canEdit || submitting}>
            <span>{selectedDifficultyLabel}</span>
          </SelectTrigger>
          <SelectContent>
            {#each difficultyOptions as option (option.value)}
              <SelectItem value={option.value} label={getDifficultyLabel(option)}>
                {getDifficultyLabel(option)}
              </SelectItem>
            {/each}
          </SelectContent>
        </Select>
      </div>

      <div class="space-y-2">
        <Label for="what_went_well">{t('task.reviews.self_assessment.what_went_well', {}, 'What went well')}</Label>
        <Textarea
          id="what_went_well"
          bind:value={formData.whatWentWell}
          rows={3}
          disabled={!canEdit || submitting}
        />
      </div>

      <div class="space-y-2">
        <Label for="what_would_do_different">{t('task.reviews.self_assessment.what_would_do_different', {}, 'What would you do differently next time?')}</Label>
        <Textarea
          id="what_would_do_different"
          bind:value={formData.whatWouldDoDifferent}
          rows={3}
          disabled={!canEdit || submitting}
        />
      </div>

      <div class="grid gap-4 md:grid-cols-3">
        <div class="space-y-2">
          <Label for="blockers_text">{t('task.reviews.self_assessment.blockers', {}, 'Blockers encountered')}</Label>
          <Textarea
            id="blockers_text"
            bind:value={formData.blockersText}
            rows={4}
            placeholder={t('task.reviews.self_assessment.blockers_placeholder', {}, 'One blocker per line')}
            disabled={!canEdit || submitting}
          />
        </div>

        <div class="space-y-2">
          <Label for="skills_lacking_text">{t('task.reviews.self_assessment.skills_lacking', {}, 'Skills felt lacking')}</Label>
          <Textarea
            id="skills_lacking_text"
            bind:value={formData.skillsLackingText}
            rows={4}
            placeholder={t('task.reviews.self_assessment.skills_placeholder', {}, 'One skill per line')}
            disabled={!canEdit || submitting}
          />
        </div>

        <div class="space-y-2">
          <Label for="skills_strong_text">{t('task.reviews.self_assessment.skills_strong', {}, 'Skills felt strong')}</Label>
          <Textarea
            id="skills_strong_text"
            bind:value={formData.skillsStrongText}
            rows={4}
            placeholder={t('task.reviews.self_assessment.skills_placeholder', {}, 'One skill per line')}
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
            {submitting ? t('task.reviews.self_assessment.saving', {}, 'Saving...') : savedAssessment ? t('task.reviews.self_assessment.update_button', {}, 'Update self assessment') : t('task.reviews.self_assessment.save_button', {}, 'Save self assessment')}
          </Button>
        </div>
      {:else}
        <p class="text-sm text-muted-foreground">
          {t('task.reviews.self_assessment.read_only_notice', {}, 'Only the reviewee can update this self assessment.')}
        </p>
      {/if}
    </div>
  {/if}
</div>
