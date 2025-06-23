<script lang="ts">
  import { router } from '@inertiajs/svelte'
  import Button from '@/components/ui/button.svelte'
  import Label from '@/components/ui/label.svelte'
  import Select from '@/components/ui/select.svelte'
  import SelectContent from '@/components/ui/select_content.svelte'
  import SelectItem from '@/components/ui/select_item.svelte'
  import SelectTrigger from '@/components/ui/select_trigger.svelte'
  import SelectValue from '@/components/ui/select_value.svelte'
  import Textarea from '@/components/ui/textarea.svelte'
  import Input from '@/components/ui/input.svelte'
  import type {
    SerializedSkill,
    ProficiencyLevelOption,
    ReviewerType,
    SkillRatingInput,
  } from '../types.svelte'

  interface Props {
    sessionId: string
    skills: SerializedSkill[]
    proficiencyLevels: ProficiencyLevelOption[]
    reviewerType: ReviewerType
    disabled?: boolean
  }

  const { sessionId, skills, proficiencyLevels, reviewerType, disabled = false }: Props = $props()

  let ratings = $state<Partial<Record<string, { level_code: string; comment: string }>>>({})

  const deliveryTimelinessOptions = [
    { value: 'ahead_of_schedule', label: 'Ahead of schedule' },
    { value: 'on_time', label: 'On time' },
    { value: 'minor_delays', label: 'Minor delays' },
    { value: 'major_delays', label: 'Major delays' },
  ]

  let overallQualityScore = $state('')
  let deliveryTimeliness = $state('on_time')
  let requirementAdherence = $state('')
  let communicationQuality = $state('')
  let codeQualityScore = $state('')
  let proactivenessScore = $state('')
  let wouldWorkWithAgain = $state<'yes' | 'no'>('yes')
  let strengthsObserved = $state('')
  let areasForImprovement = $state('')
  let submitting = $state(false)

  const isManagerReview = $derived(reviewerType === 'manager')
  const isValid = $derived(skills.every((skill) => ratings[skill.id]?.level_code !== ''))

  $effect(() => {
    if (Object.keys(ratings).length > 0) {
      return
    }

    ratings = Object.fromEntries(
      skills.map((skill) => [skill.id, { level_code: '', comment: '' }])
    )
  })

  const parseNumeric = (raw: string) => {
    const value = Number(raw)
    return Number.isFinite(value) ? value : undefined
  }

  function handleSubmit() {
    if (!isValid || submitting || disabled) return

    submitting = true

    const skillRatings: SkillRatingInput[] = skills.map((skill) => ({
      skill_id: skill.id,
      level_code: ratings[skill.id]?.level_code ?? '',
      comment: ratings[skill.id]?.comment || undefined,
    }))

    router.post(
      `/reviews/${sessionId}/submit`,
      {
        reviewer_type: reviewerType,
        skill_ratings: skillRatings,
        overall_quality_score: isManagerReview ? parseNumeric(overallQualityScore) : undefined,
        delivery_timeliness: isManagerReview ? deliveryTimeliness : undefined,
        requirement_adherence: isManagerReview ? parseNumeric(requirementAdherence) : undefined,
        communication_quality: isManagerReview ? parseNumeric(communicationQuality) : undefined,
        code_quality_score: isManagerReview ? parseNumeric(codeQualityScore) : undefined,
        proactiveness_score: isManagerReview ? parseNumeric(proactivenessScore) : undefined,
        would_work_with_again: isManagerReview ? wouldWorkWithAgain === 'yes' : undefined,
        strengths_observed: isManagerReview ? strengthsObserved || undefined : undefined,
        areas_for_improvement: isManagerReview ? areasForImprovement || undefined : undefined,
      },
      {
        preserveScroll: true,
        onFinish: () => {
          submitting = false
        },
      }
    )
  }
</script>

<form onsubmit={(event) => { event.preventDefault(); handleSubmit(); }} class="space-y-6">
  <div class="space-y-4">
    {#each skills as skill (skill.id)}
      {@const rating = ratings[skill.id] ?? { level_code: '', comment: '' }}
      <div class="space-y-3 rounded-lg border p-4">
        <div>
          <h4 class="text-sm font-medium">{skill.skill_name}</h4>
          {#if skill.description}
            <p class="mt-0.5 text-xs text-muted-foreground">{skill.description}</p>
          {/if}
          <span class="mt-1 inline-block rounded bg-muted px-1.5 py-0.5 text-[10px] capitalize text-muted-foreground">
            {skill.category_code.replace('_', ' ')}
          </span>
        </div>

        <div class="space-y-2">
          <Label for="level-{skill.id}">Mức độ thành thạo</Label>
          <Select
            type="single"
            value={rating.level_code}
            onValueChange={(value: string) => {
              const current = ratings[skill.id] ?? { level_code: '', comment: '' }
              ratings[skill.id] = { ...current, level_code: value }
            }}
          >
            <SelectTrigger class="w-full" disabled={disabled}>
              <SelectValue placeholder="Chọn mức độ..." />
            </SelectTrigger>
            <SelectContent>
              {#each proficiencyLevels as level (level.value)}
                <SelectItem value={level.value}>
                  <div class="flex items-center gap-2">
                    <span
                      class="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                      style="background-color: {level.colorHex}"
                    ></span>
                    <span>{level.labelVi}</span>
                    <span class="text-xs text-muted-foreground">
                      ({level.minPercentage}-{level.maxPercentage}%)
                    </span>
                  </div>
                </SelectItem>
              {/each}
            </SelectContent>
          </Select>
        </div>

        <div class="space-y-2">
          <Label for="comment-{skill.id}">Nhận xét</Label>
          <Textarea
            id="comment-{skill.id}"
            value={rating.comment}
            oninput={(event: Event) => {
              const current = ratings[skill.id] ?? { level_code: '', comment: '' }
              ratings[skill.id] = {
                ...current,
                comment: (event.target as HTMLTextAreaElement).value,
              }
            }}
            placeholder="Quan sát cụ thể về kỹ năng này..."
            rows={2}
            disabled={disabled}
            class="resize-none"
          />
        </div>
      </div>
    {/each}
  </div>

  {#if isManagerReview}
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
            bind:value={overallQualityScore}
            disabled={disabled}
          />
        </div>

        <div class="space-y-2">
          <Label for="delivery_timeliness">Delivery timeliness</Label>
        <Select
          value={deliveryTimeliness}
          onValueChange={(value: string) => {
            deliveryTimeliness = value
          }}
        >
          <SelectTrigger disabled={disabled}>
            <span>{deliveryTimelinessOptions.find((option) => option.value === deliveryTimeliness)?.label || 'Chọn timeliness'}</span>
          </SelectTrigger>
            <SelectContent>
              {#each deliveryTimelinessOptions as option (option.value)}
                <SelectItem value={option.value} label={option.label}>
                  {option.label}
                </SelectItem>
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
            bind:value={requirementAdherence}
            disabled={disabled}
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
            bind:value={communicationQuality}
            disabled={disabled}
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
            bind:value={codeQualityScore}
            disabled={disabled}
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
            bind:value={proactivenessScore}
            disabled={disabled}
          />
        </div>
      </div>

      <div class="space-y-2">
        <Label for="would_work_with_again">Would work with again?</Label>
        <Select
          value={wouldWorkWithAgain}
          onValueChange={(value: string) => {
            if (value === 'yes' || value === 'no') {
              wouldWorkWithAgain = value
            }
          }}
        >
          <SelectTrigger disabled={disabled}>
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
          bind:value={strengthsObserved}
          rows={3}
          placeholder="Điểm mạnh thể hiện rõ trong task..."
          disabled={disabled}
        />
      </div>

      <div class="space-y-2">
        <Label for="areas_for_improvement">Areas for improvement</Label>
        <Textarea
          id="areas_for_improvement"
          bind:value={areasForImprovement}
          rows={3}
          placeholder="Điểm cần cải thiện hoặc nên theo dõi ở task tiếp theo..."
          disabled={disabled}
        />
      </div>
    </div>
  {/if}

  <Button type="submit" disabled={!isValid || submitting || disabled} class="w-full">
    {submitting ? 'Đang gửi...' : 'Gửi đánh giá'}
  </Button>
</form>
