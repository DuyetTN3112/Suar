<script lang="ts">
  import Input from '@/components/ui/input.svelte'
  import Label from '@/components/ui/label.svelte'
  import Select from '@/components/ui/select.svelte'
  import SelectContent from '@/components/ui/select_content.svelte'
  import SelectItem from '@/components/ui/select_item.svelte'
  import SelectTrigger from '@/components/ui/select_trigger.svelte'
  import Textarea from '@/components/ui/textarea.svelte'

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
    { value: 'ahead_of_schedule', label: 'Ahead of schedule' },
    { value: 'on_time', label: 'On time' },
    { value: 'minor_delays', label: 'Minor delays' },
    { value: 'major_delays', label: 'Major delays' },
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
</script>

<div class="space-y-4 rounded-lg border bg-muted/10 p-4">
  <div>
    <h4 class="text-sm font-semibold">Đánh giá tổng quan của quản lý</h4>
    <p class="text-xs text-muted-foreground">
      Các chỉ số này sẽ được dùng cho performance stats, trust score và profile snapshot.
    </p>
  </div>

  <div class="grid gap-4 md:grid-cols-2">
    <div class="space-y-2">
      <Label for="overall_quality_score">Overall quality score (1-5)</Label>
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
      <Label for="delivery_timeliness">Delivery timeliness</Label>
      <Select value={deliveryTimeliness} onValueChange={onDeliveryTimelinessChange}>
        <SelectTrigger {disabled}>
          <span>{deliveryTimelinessOptions.find((option) => option.value === deliveryTimeliness)?.label ?? 'Chọn timeliness'}</span>
        </SelectTrigger>
        <SelectContent>
          {#each deliveryTimelinessOptions as option (option.value)}
            <SelectItem value={option.value} label={option.label}>{option.label}</SelectItem>
          {/each}
        </SelectContent>
      </Select>
    </div>

    <div class="space-y-2">
      <Label for="requirement_adherence">Requirement adherence (1-5)</Label>
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
      <Label for="communication_quality">Communication quality (1-5)</Label>
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
      <Label for="code_quality_score">Code quality score (1-5)</Label>
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
      <Label for="proactiveness_score">Proactiveness score (1-5)</Label>
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
    <Label for="would_work_with_again">Would work with again?</Label>
    <Select
      value={wouldWorkWithAgain}
      onValueChange={(value: string) => {
        if (value === 'yes' || value === 'no') {
          onWouldWorkWithAgainChange(value)
        }
      }}
    >
      <SelectTrigger {disabled}>
        <span>{wouldWorkWithAgain === 'yes' ? 'Yes' : 'No'}</span>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="yes" label="Yes">Yes</SelectItem>
        <SelectItem value="no" label="No">No</SelectItem>
      </SelectContent>
    </Select>
  </div>

  <div class="space-y-2">
    <Label for="strengths_observed">Strengths observed</Label>
    <Textarea
      id="strengths_observed"
      value={strengthsObserved}
      oninput={(event: Event) => {
        onStrengthsObservedChange((event.currentTarget as HTMLTextAreaElement).value)
      }}
      rows={3}
      placeholder="Điểm mạnh thể hiện rõ trong task..."
      {disabled}
    />
  </div>

  <div class="space-y-2">
    <Label for="areas_for_improvement">Areas for improvement</Label>
    <Textarea
      id="areas_for_improvement"
      value={areasForImprovement}
      oninput={(event: Event) => {
        onAreasForImprovementChange((event.currentTarget as HTMLTextAreaElement).value)
      }}
      rows={3}
      placeholder="Điểm cần cải thiện hoặc nên theo dõi ở task tiếp theo..."
      {disabled}
    />
  </div>
</div>
