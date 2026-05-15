<script lang="ts">
  import { router } from '@inertiajs/svelte'
  import axios from 'axios'
  import { onMount } from 'svelte'

  import Button from '@/components/ui/button.svelte'
  import Label from '@/components/ui/label.svelte'
  import ProficiencyLevelBadge from '@/components/ui/proficiency_level_badge.svelte'
  import Select from '@/components/ui/select.svelte'
  import SelectContent from '@/components/ui/select_content.svelte'
  import SelectItem from '@/components/ui/select_item.svelte'
  import SelectTrigger from '@/components/ui/select_trigger.svelte'
  import SelectValue from '@/components/ui/select_value.svelte'
  import Textarea from '@/components/ui/textarea.svelte'

  import type {
    ReviewEvidenceItem,
    SerializedSkill,
    ProficiencyLevelOption,
    ReviewerType,
  } from '../types.svelte'

  import ManagerReviewSection from './manager_review_section.svelte'

  interface ProficiencyLevel {
    id: string
    ordinal: number
    code: string
    display_name: string
    short_name?: string
    generic_description?: string
  }

  interface TaskRequirement {
    id: string
    skill_id: string
    is_mandatory: boolean
    importance: 'low' | 'medium' | 'high' | 'critical'
    weight: number
    requirement_source: string
    requirement_notes?: string | null
    skill?: SerializedSkill | null
    minimum_level?: ProficiencyLevel | null
    target_level?: ProficiencyLevel | null
    assessment_ceiling_level?: ProficiencyLevel | null
    rubric_version?: { id: string; version: number; status: string } | null
  }

  interface RubricLevel {
    proficiency_level: { code: string; display_name: string } | null
    summary: string | null
    observable_behaviors: string[] | null
    evidence_guidance: string | null
    positive_examples: string[] | null
    negative_examples: string[] | null
  }

  interface SkillRubric {
    id: string
    version: number
    levels: RubricLevel[]
  }

  interface RatingDraft {
    level_code: string
    comment: string
    insufficient_evidence: boolean
    confidence: 'low' | 'medium' | 'high' | ''
    rationale: string
    observable_behaviors: string[]
    evidence_ids: string[]
  }

  interface Props {
    sessionId: string
    skills: SerializedSkill[]
    proficiencyLevels: ProficiencyLevelOption[]
    reviewerType: ReviewerType
    taskId?: string | null
    disabled?: boolean
  }

  const {
    sessionId,
    skills,
    proficiencyLevels,
    reviewerType,
    taskId = null,
    disabled = false,
  }: Props = $props()

  let ratings = $state<Partial<Record<string, RatingDraft>>>({})
  let requirements = $state<TaskRequirement[]>([])
  let rubrics = $state<Record<string, SkillRubric | null>>({})
  let evidences = $state<ReviewEvidenceItem[]>([])
  let contextLoading = $state(false)
  let contextError = $state('')

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
  const requirementsBySkill = $derived(
    new Map(requirements.map((requirement) => [requirement.skill_id, requirement]))
  )
  const reviewSkills = $derived(() => {
    if (requirements.length === 0) return skills

    const skillsById = new Map(skills.map((skill) => [skill.id, skill]))
    return requirements
      .map((requirement) => requirement.skill ?? skillsById.get(requirement.skill_id))
      .filter((skill): skill is SerializedSkill => Boolean(skill))
  })
  const isValid = $derived(reviewSkills().every((skill) => ratings[skill.id]?.level_code !== ''))

  $effect(() => {
    const nextRatings = { ...ratings }
    let changed = false

    for (const skill of reviewSkills()) {
      if (!nextRatings[skill.id]) {
        nextRatings[skill.id] = {
          level_code: '',
          comment: '',
          insufficient_evidence: false,
          confidence: '',
          rationale: '',
          observable_behaviors: [],
          evidence_ids: [],
        }
        changed = true
      }
    }

    if (changed) ratings = nextRatings
  })

  async function loadRequirementContext() {
    if (!taskId) return

    contextLoading = true
    contextError = ''

    try {
      const response = await axios.get<{ data: TaskRequirement[] }>(
        `/api/v1/tasks/${taskId}/requirements`
      )
      requirements = response.data.data
      const evidenceResponse = await axios.get<{ data: ReviewEvidenceItem[] }>(
        `/reviews/${sessionId}/evidences`
      )
      evidences = evidenceResponse.data.data

      const rubricResults = await Promise.allSettled(
        requirements.map(async (requirement) => {
          const rubricResponse = await axios.get<{ data: SkillRubric }>(
            `/api/v1/skills/${requirement.skill_id}/rubric`
          )
          return [requirement.skill_id, rubricResponse.data.data] as const
        })
      )

      rubrics = Object.fromEntries(
        rubricResults
          .filter((result): result is PromiseFulfilledResult<readonly [string, SkillRubric]> => result.status === 'fulfilled')
          .map((result) => result.value)
      )
    } catch {
      contextError = 'Không tải được requirement/rubric context cho review.'
    } finally {
      contextLoading = false
    }
  }

  function matchingRubricLevel(skillId: string, levelCode: string): RubricLevel | null {
    if (!levelCode) return null
    return rubrics[skillId]?.levels.find((level) => level.proficiency_level?.code === levelCode) ?? null
  }

  function emptyRating(): RatingDraft {
    return {
      level_code: '',
      comment: '',
      insufficient_evidence: false,
      confidence: '',
      rationale: '',
      observable_behaviors: [],
      evidence_ids: [],
    }
  }

  function updateRating(skillId: string, patch: Partial<RatingDraft>) {
    ratings = {
      ...ratings,
      [skillId]: {
        ...(ratings[skillId] ?? emptyRating()),
        ...patch,
      },
    }
  }

  function toggleBehavior(skillId: string, behavior: string) {
    const current = ratings[skillId] ?? emptyRating()
    const selected = new Set(current.observable_behaviors)
    if (selected.has(behavior)) selected.delete(behavior)
    else selected.add(behavior)
    updateRating(skillId, { observable_behaviors: [...selected] })
  }

  function toggleEvidence(skillId: string, evidenceId: string) {
    const current = ratings[skillId] ?? emptyRating()
    const selected = new Set(current.evidence_ids)
    if (selected.has(evidenceId)) selected.delete(evidenceId)
    else selected.add(evidenceId)
    updateRating(skillId, { evidence_ids: [...selected] })
  }

  onMount(() => {
    void loadRequirementContext()
  })

  const parseNumeric = (raw: string) => {
    const value = Number(raw)
    return Number.isFinite(value) ? value : undefined
  }

  function handleSubmit() {
    if (!isValid || submitting || disabled) return

    submitting = true

    const skillRatings = reviewSkills().map((skill) => {
      const rating = ratings[skill.id] ?? emptyRating()
      return {
        skill_id: skill.id,
        level_code: rating.level_code,
        comment: rating.comment || undefined,
        insufficient_evidence: rating.insufficient_evidence,
        rubric_version_id: requirementsBySkill.get(skill.id)?.rubric_version?.id ?? null,
        confidence: rating.confidence || null,
        rationale: rating.rationale || null,
        observable_behaviors: rating.observable_behaviors,
        evidence_ids: rating.evidence_ids,
      }
    })

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
  {#if contextLoading}
    <div class="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
      Đang tải requirement/rubric context...
    </div>
  {:else if contextError}
    <div class="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
      {contextError}
    </div>
  {/if}

  <div class="space-y-4">
    {#each reviewSkills() as skill (skill.id)}
      {@const rating = ratings[skill.id] ?? emptyRating()}
      {@const requirement = requirementsBySkill.get(skill.id)}
      {@const rubricLevel = matchingRubricLevel(skill.id, rating.level_code)}
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

        {#if requirement}
          <div class="rounded-md border bg-muted/20 p-3 text-xs">
            <div class="mb-2 flex flex-wrap items-center gap-2">
              <span class="font-semibold text-foreground">Task requirement</span>
              {#if requirement.is_mandatory}
                <span class="rounded bg-orange-03 px-1.5 py-0.5 font-bold uppercase text-destructive">Bắt buộc</span>
              {/if}
              <span class="rounded border px-1.5 py-0.5 text-muted-foreground">{requirement.importance}</span>
              <span class="text-muted-foreground">weight {requirement.weight}</span>
            </div>
            <div class="flex flex-wrap items-center gap-1.5">
              <span class="text-muted-foreground">Minimum</span>
              <ProficiencyLevelBadge level={requirement.minimum_level} size="xs" />
              <span class="text-muted-foreground">Target</span>
              <ProficiencyLevelBadge level={requirement.target_level} size="xs" />
              <span class="text-muted-foreground">Ceiling</span>
              <ProficiencyLevelBadge level={requirement.assessment_ceiling_level} size="xs" />
              {#if requirement.rubric_version}
                <span class="ml-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">
                  rubric v{requirement.rubric_version.version}
                </span>
              {/if}
            </div>
            {#if requirement.requirement_notes}
              <p class="mt-2 text-muted-foreground">{requirement.requirement_notes}</p>
            {/if}
          </div>
        {:else if taskId}
          <div class="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
            Không có task requirement cụ thể cho skill này.
          </div>
        {/if}

        <div class="space-y-2">
          <Label for="level-{skill.id}">Mức độ thành thạo</Label>
          <Select
            type="single"
            value={rating.level_code}
            onValueChange={(value: string) => {
              updateRating(skill.id, { level_code: value })
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

        {#if rubricLevel}
          <div class="rounded-md border border-blue-100 bg-ink-04/60 p-3 text-xs text-blue-950">
            <p class="font-semibold">Rubric cho mức đã chọn: {rubricLevel.proficiency_level?.display_name}</p>
            {#if rubricLevel.summary}
              <p class="mt-1">{rubricLevel.summary}</p>
            {/if}
            {#if rubricLevel.observable_behaviors?.length}
              <p class="mt-2 font-semibold">Observable behaviors</p>
              <ul class="mt-1 space-y-1">
                {#each rubricLevel.observable_behaviors.slice(0, 3) as behavior}
                  <li>
                    <label class="flex items-start gap-2">
                      <input
                        type="checkbox"
                        class="mt-0.5 h-3.5 w-3.5"
                        checked={rating.observable_behaviors.includes(behavior)}
                        onchange={() => { toggleBehavior(skill.id, behavior); }}
                        disabled={disabled}
                      />
                      <span>{behavior}</span>
                    </label>
                  </li>
                {/each}
              </ul>
            {/if}
            {#if rubricLevel.evidence_guidance}
              <p class="mt-2 text-foreground">{rubricLevel.evidence_guidance}</p>
            {/if}
          </div>
        {/if}

        <div class="grid gap-3 sm:grid-cols-2">
          <div class="space-y-2">
            <Label for="confidence-{skill.id}">Độ tin cậy evidence</Label>
            <select
              id="confidence-{skill.id}"
              value={rating.confidence}
              onchange={(event) => {
                updateRating(skill.id, {
                  confidence: (event.target as HTMLSelectElement).value as RatingDraft['confidence'],
                })
              }}
              disabled={disabled}
              class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Chưa chọn</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          <label class="flex items-center gap-2 rounded-md border p-3 text-sm">
            <input
              type="checkbox"
              checked={rating.insufficient_evidence}
              onchange={(event) => {
                updateRating(skill.id, {
                  insufficient_evidence: (event.target as HTMLInputElement).checked,
                })
              }}
              disabled={disabled}
              class="h-4 w-4"
            />
            <span>Insufficient evidence cho observed level</span>
          </label>
        </div>

        <div class="space-y-2">
          <Label for="rationale-{skill.id}">Rationale</Label>
          <Textarea
            id="rationale-{skill.id}"
            value={rating.rationale}
            oninput={(event: Event) => {
              updateRating(skill.id, { rationale: (event.target as HTMLTextAreaElement).value })
            }}
            disabled={disabled}
            rows={2}
            placeholder="Vì sao mức này phù hợp với evidence đã quan sát?"
          />
        </div>

        <div class="space-y-2">
          <Label>Evidence liên kết</Label>
          {#if evidences.length === 0}
            <p class="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
              Chưa có evidence trong review session. Thêm ở tab Evidence trước khi submit nếu cần.
            </p>
          {:else}
            <div class="grid gap-2 sm:grid-cols-2">
              {#each evidences as evidence (evidence.id)}
                <label class="flex items-start gap-2 rounded-md border p-2 text-xs">
                  <input
                    type="checkbox"
                    class="mt-0.5 h-3.5 w-3.5"
                    checked={rating.evidence_ids.includes(evidence.id)}
                    onchange={() => { toggleEvidence(skill.id, evidence.id); }}
                    disabled={disabled}
                  />
                  <span>
                    <span class="font-medium">{evidence.title ?? evidence.evidence_type}</span>
                    {#if evidence.url}
                      <span class="block truncate text-muted-foreground">{evidence.url}</span>
                    {/if}
                  </span>
                </label>
              {/each}
            </div>
          {/if}
        </div>

        <div class="space-y-2">
          <Label for="comment-{skill.id}">Nhận xét</Label>
          <Textarea
            id="comment-{skill.id}"
            value={rating.comment}
            oninput={(event: Event) => {
              updateRating(skill.id, { comment: (event.target as HTMLTextAreaElement).value })
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
