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

  import type {
    SerializedSkill,
    ProficiencyLevelOption,
    ReviewerType,
  } from '../types.svelte'

  import ManagerReviewSection from './manager_review_section.svelte'

  interface Props {
    sessionId: string
    skills: SerializedSkill[]
    proficiencyLevels: ProficiencyLevelOption[]
    reviewerType: ReviewerType
    disabled?: boolean
  }

  const { sessionId, skills, proficiencyLevels, reviewerType, disabled = false }: Props = $props()

  let ratings = $state<Partial<Record<string, { level_code: string; comment: string }>>>({})

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

    const skillRatings = skills.map<Record<string, string | undefined>>((skill) => ({
      skill_id: skill.id,
      level_code: ratings[skill.id]?.level_code ?? '',
      comment: ratings[skill.id]?.comment ?? undefined,
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
        preserveState: true,
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
    <ManagerReviewSection
      {disabled}
      {overallQualityScore}
      {deliveryTimeliness}
      {requirementAdherence}
      {communicationQuality}
      {codeQualityScore}
      {proactivenessScore}
      {wouldWorkWithAgain}
      {strengthsObserved}
      {areasForImprovement}
      onOverallQualityScoreChange={(value: string) => {
        overallQualityScore = value
      }}
      onDeliveryTimelinessChange={(value: string) => {
        deliveryTimeliness = value
      }}
      onRequirementAdherenceChange={(value: string) => {
        requirementAdherence = value
      }}
      onCommunicationQualityChange={(value: string) => {
        communicationQuality = value
      }}
      onCodeQualityScoreChange={(value: string) => {
        codeQualityScore = value
      }}
      onProactivenessScoreChange={(value: string) => {
        proactivenessScore = value
      }}
      onWouldWorkWithAgainChange={(value: 'yes' | 'no') => {
        wouldWorkWithAgain = value
      }}
      onStrengthsObservedChange={(value: string) => {
        strengthsObserved = value
      }}
      onAreasForImprovementChange={(value: string) => {
        areasForImprovement = value
      }}
    />
  {/if}

  <Button type="submit" disabled={!isValid || submitting || disabled} class="w-full">
    {submitting ? 'Đang gửi...' : 'Gửi đánh giá'}
  </Button>
</form>
