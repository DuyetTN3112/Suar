<script lang="ts">
  import Input from '@/apps/user/shared/ui/input.svelte'
  import Label from '@/apps/user/shared/ui/label.svelte'
  import Select from '@/apps/user/shared/ui/select.svelte'
  import SelectContent from '@/apps/user/shared/ui/select_content.svelte'
  import SelectItem from '@/apps/user/shared/ui/select_item.svelte'
  import SelectTrigger from '@/apps/user/shared/ui/select_trigger.svelte'
  import Textarea from '@/apps/user/shared/ui/textarea.svelte'
  import { useTranslation } from '@/apps/user/shared/stores/translation.svelte'

  interface Props {
    disabled?: boolean
    overallQualityScore: string
    deliveryTimeliness: string
    requirementAdherence: string
    communicationQuality: string
    codeQualityScore: string
    proactivenessScore: string
    wouldWorkWithAgain: 'yes' | 'no'
    strengthsObserved: string
    areasForImprovement: string
    onOverallQualityScoreChange: (value: string) => void
    onDeliveryTimelinessChange: (value: string) => void
    onRequirementAdherenceChange: (value: string) => void
    onCommunicationQualityChange: (value: string) => void
    onCodeQualityScoreChange: (value: string) => void
    onProactivenessScoreChange: (value: string) => void
    onWouldWorkWithAgainChange: (value: 'yes' | 'no') => void
    onStrengthsObservedChange: (value: string) => void
    onAreasForImprovementChange: (value: string) => void
  }

  const deliveryTimelinessOptions = [
    { value: 'ahead_of_schedule', labelKey: 'task.reviews.manager_form.delivery.ahead_of_schedule', label: 'Ahead of schedule' },
    { value: 'on_time', labelKey: 'task.reviews.manager_form.delivery.on_time', label: 'On time' },
    { value: 'minor_delays', labelKey: 'task.reviews.manager_form.delivery.minor_delays', label: 'Minor delays' },
    { value: 'major_delays', labelKey: 'task.reviews.manager_form.delivery.major_delays', label: 'Major delays' },
  ]

  const {
    disabled = false,
    overallQualityScore,
    deliveryTimeliness,
    requirementAdherence,
    communicationQuality,
    codeQualityScore,
    proactivenessScore,
    wouldWorkWithAgain,
    strengthsObserved,
    areasForImprovement,
    onOverallQualityScoreChange,
    onDeliveryTimelinessChange,
    onRequirementAdherenceChange,
    onCommunicationQualityChange,
    onCodeQualityScoreChange,
    onProactivenessScoreChange,
    onWouldWorkWithAgainChange,
    onStrengthsObservedChange,
    onAreasForImprovementChange,
  }: Props = $props()

  const { t } = useTranslation()
  const selectedDeliveryTimelinessLabel = $derived.by(() => {
    const selectedOption = deliveryTimelinessOptions.find((option) => option.value === deliveryTimeliness)
    return selectedOption
      ? t(selectedOption.labelKey, {}, selectedOption.label)
      : t('task.reviews.manager_form.delivery_placeholder', {}, 'Select delivery timeliness')
  })
</script>

<div class="space-y-4 rounded-lg border bg-muted/10 p-4">
  <div>
    <h4 class="text-sm font-semibold">{t('task.reviews.manager_form.title', {}, 'Manager overall review')}</h4>
  </div>

  <div class="grid gap-4 md:grid-cols-2">
    <div class="space-y-2">
      <Label for="overall_quality_score">{t('task.reviews.manager_form.overall_quality', {}, 'Overall quality (1-5)')}</Label>
      <Input
        id="overall_quality_score"
        type="number"
        min="1"
        max="5"
        step="1"
        value={overallQualityScore}
        oninput={(event: Event) => {
          onOverallQualityScoreChange((event.currentTarget as HTMLInputElement).value)
        }}
        {disabled}
      />
    </div>

    <div class="space-y-2">
      <Label for="delivery_timeliness">{t('task.reviews.manager_form.delivery_timeliness', {}, 'Delivery timeliness')}</Label>
      <Select value={deliveryTimeliness} onValueChange={onDeliveryTimelinessChange}>
        <SelectTrigger {disabled}>
          <span>{selectedDeliveryTimelinessLabel}</span>
        </SelectTrigger>
        <SelectContent>
          {#each deliveryTimelinessOptions as option (option.value)}
            {@const optionLabel = t(option.labelKey, {}, option.label)}
            <SelectItem value={option.value} label={optionLabel}>{optionLabel}</SelectItem>
          {/each}
        </SelectContent>
      </Select>
    </div>

    <div class="space-y-2">
      <Label for="requirement_adherence">{t('task.reviews.manager_form.requirement_adherence', {}, 'Requirement adherence (1-5)')}</Label>
      <Input
        id="requirement_adherence"
        type="number"
        min="1"
        max="5"
        step="1"
        value={requirementAdherence}
        oninput={(event: Event) => {
          onRequirementAdherenceChange((event.currentTarget as HTMLInputElement).value)
        }}
        {disabled}
      />
    </div>

    <div class="space-y-2">
      <Label for="communication_quality">{t('task.reviews.manager_form.communication_quality', {}, 'Communication (1-5)')}</Label>
      <Input
        id="communication_quality"
        type="number"
        min="1"
        max="5"
        step="1"
        value={communicationQuality}
        oninput={(event: Event) => {
          onCommunicationQualityChange((event.currentTarget as HTMLInputElement).value)
        }}
        {disabled}
      />
    </div>

    <div class="space-y-2">
      <Label for="code_quality_score">{t('task.reviews.manager_form.code_quality', {}, 'Code quality (1-5)')}</Label>
      <Input
        id="code_quality_score"
        type="number"
        min="1"
        max="5"
        step="1"
        value={codeQualityScore}
        oninput={(event: Event) => {
          onCodeQualityScoreChange((event.currentTarget as HTMLInputElement).value)
        }}
        {disabled}
      />
    </div>

    <div class="space-y-2">
      <Label for="proactiveness_score">{t('task.reviews.manager_form.proactiveness', {}, 'Proactiveness (1-5)')}</Label>
      <Input
        id="proactiveness_score"
        type="number"
        min="1"
        max="5"
        step="1"
        value={proactivenessScore}
        oninput={(event: Event) => {
          onProactivenessScoreChange((event.currentTarget as HTMLInputElement).value)
        }}
        {disabled}
      />
    </div>
  </div>

  <div class="space-y-2">
    <Label for="would_work_with_again">{t('task.reviews.manager_form.would_work_with_again', {}, 'Would work together again?')}</Label>
    <Select
      value={wouldWorkWithAgain}
      onValueChange={(value: string) => {
        if (value === 'yes' || value === 'no') {
          onWouldWorkWithAgainChange(value)
        }
      }}
    >
      <SelectTrigger {disabled}>
        <span>{wouldWorkWithAgain === 'yes' ? t('task.reviews.manager_form.yes', {}, 'Yes') : t('task.reviews.manager_form.no', {}, 'No')}</span>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="yes" label={t('task.reviews.manager_form.yes', {}, 'Yes')}>{t('task.reviews.manager_form.yes', {}, 'Yes')}</SelectItem>
        <SelectItem value="no" label={t('task.reviews.manager_form.no', {}, 'No')}>{t('task.reviews.manager_form.no', {}, 'No')}</SelectItem>
      </SelectContent>
    </Select>
  </div>

  <div class="space-y-2">
    <Label for="strengths_observed">{t('task.reviews.manager_form.strengths', {}, 'Strengths')}</Label>
    <Textarea
      id="strengths_observed"
      value={strengthsObserved}
      oninput={(event: Event) => {
        onStrengthsObservedChange((event.currentTarget as HTMLTextAreaElement).value)
      }}
      rows={3}
      placeholder={t('task.reviews.manager_form.strengths_placeholder', {}, 'Strengths clearly shown in this task...')}
      {disabled}
    />
  </div>

  <div class="space-y-2">
    <Label for="areas_for_improvement">{t('task.reviews.manager_form.areas_for_improvement', {}, 'Areas for improvement')}</Label>
    <Textarea
      id="areas_for_improvement"
      value={areasForImprovement}
      oninput={(event: Event) => {
        onAreasForImprovementChange((event.currentTarget as HTMLTextAreaElement).value)
      }}
      rows={3}
      placeholder={t('task.reviews.manager_form.areas_placeholder', {}, 'Areas to improve or watch in the next task...')}
      {disabled}
    />
  </div>
</div>
