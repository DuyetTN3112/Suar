<script lang="ts">
  import { router } from '@inertiajs/svelte'
  import axios from 'axios'
  import { onMount } from 'svelte'

  import Button from '@/apps/org/shared/ui/button.svelte'
  import { useTranslation } from '@/apps/org/shared/stores/translation.svelte'
  import type {
    ReviewEvidenceItem,
    SerializedSkill,
    ProficiencyLevelOption,
    ReviewerType,
  } from '../types.svelte'

  import ManagerReviewSection from './manager_review_section.svelte'
  import SkillRatingItem from './skill_rating_item.svelte'

  interface ProficiencyLevel {
    id: string
    ordinal: number
    code: string
    displayName: string
    shortName?: string
    genericDescription?: string
  }

  interface TaskRequirement {
    id: string
    skillId: string
    isMandatory: boolean
    importance: 'low' | 'medium' | 'high' | 'critical'
    weight: number
    requirementSource: string
    requirementNotes?: string | null
    skill?: SerializedSkill | null
    minimumLevel?: ProficiencyLevel | null
    targetLevel?: ProficiencyLevel | null
    assessmentCeilingLevel?: ProficiencyLevel | null
    rubricVersion?: { id: string; version: number; status: string } | null
  }

  interface RequirementSkillPayload {
    id?: string
    skill_id?: string
    skillId?: string
    skill_name?: string
    skillName?: string
    skill_code?: string
    skillCode?: string
    description?: string | null
    category_code?: string
    categoryCode?: string
    display_type?: string
    displayType?: string
    is_active?: boolean
    isActive?: boolean
    sort_order?: number
    sortOrder?: number
  }

  interface RubricLevel {
    proficiencyLevel: { code: string; displayName: string } | null
    summary: string | null
    observableBehaviors: string[] | null
    evidenceGuidance: string | null
    positiveExamples: string[] | null
    negativeExamples: string[] | null
  }

  interface SkillRubric {
    id: string
    version: number
    levels: RubricLevel[]
  }

  interface RatingDraft {
    levelCode: string
    comment: string
    insufficientEvidence: boolean
    confidence: 'low' | 'medium' | 'high' | ''
    rationale: string
    observableBehaviors: string[]
    evidenceIds: string[]
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
  const { t } = useTranslation()

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
    new Map(requirements.map((requirement) => [requirement.skillId, requirement]))
  )
  const reviewSkills = $derived(() => {
    if (requirements.length === 0) return skills

    const skillsById = new Map(skills.map((skill) => [skill.id, skill]))
    return requirements
      .map((requirement) => normalizeRequirementSkill(requirement, skillsById))
      .filter((skill): skill is SerializedSkill => Boolean(skill))
  })
  const isValid = $derived(reviewSkills().every((skill) => ratings[skill.id]?.levelCode !== ''))

  $effect(() => {
    const nextRatings = { ...ratings }
    let changed = false

    for (const skill of reviewSkills()) {
      if (!nextRatings[skill.id]) {
        nextRatings[skill.id] = {
          levelCode: '',
          comment: '',
          insufficientEvidence: false,
          confidence: '',
          rationale: '',
          observableBehaviors: [],
          evidenceIds: [],
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
        `/reviews/${sessionId}/evidences`,
        { params: { page: 1, perPage: 100 } }
      )
      evidences = evidenceResponse.data.data

      const rubricResults = await Promise.allSettled(
        requirements.filter((requirement) => requirement.rubricVersion).map(async (requirement) => {
          const rubricResponse = await axios.get<{ data: SkillRubric }>(
            `/api/v1/skills/${requirement.skillId}/rubric`
          )
          return [requirement.skillId, rubricResponse.data.data] as const
        })
      )

      rubrics = Object.fromEntries(
        rubricResults
          .filter((result): result is PromiseFulfilledResult<readonly [string, SkillRubric]> => result.status === 'fulfilled')
          .map((result) => result.value)
      )
    } catch {
      contextError = t('task.reviews.skill_form.context_error', {}, 'Unable to load requirement/rubric context for this review.')
    } finally {
      contextError = ''
      contextLoading = false
    }
  }

  function emptyRating(): RatingDraft {
    return {
      levelCode: '',
      comment: '',
      insufficientEvidence: false,
      confidence: '',
      rationale: '',
      observableBehaviors: [],
      evidenceIds: [],
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

  function normalizeRequirementSkill(
    requirement: TaskRequirement,
    skillsById: Map<string, SerializedSkill>
  ): SerializedSkill | null {
    const fallback = skillsById.get(requirement.skillId)
    const raw = requirement.skill as RequirementSkillPayload | null | undefined
    if (!raw) return fallback ?? null

    const id = raw.id ?? raw.skill_id ?? raw.skillId ?? requirement.skillId
    const skillName = raw.skill_name ?? raw.skillName ?? fallback?.skill_name
    const categoryCode = raw.category_code ?? raw.categoryCode ?? fallback?.category_code

    if (!id || !skillName || !categoryCode) return fallback ?? null

    return {
      id,
      skill_name: skillName,
      skill_code: raw.skill_code ?? raw.skillCode ?? fallback?.skill_code ?? id,
      description: raw.description ?? fallback?.description ?? null,
      category_code: categoryCode,
      display_type: raw.display_type ?? raw.displayType ?? fallback?.display_type ?? 'spider_chart',
      is_active: raw.is_active ?? raw.isActive ?? fallback?.is_active ?? true,
      sort_order: raw.sort_order ?? raw.sortOrder ?? fallback?.sort_order ?? 0,
    }
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
        skillId: skill.id,
        levelCode: rating.levelCode,
        comment: rating.comment || undefined,
        insufficientEvidence: rating.insufficientEvidence,
        rubricVersionId: requirementsBySkill.get(skill.id)?.rubricVersion?.id ?? null,
        confidence: rating.confidence || null,
        rationale: rating.rationale || null,
        observableBehaviors: rating.observableBehaviors,
        evidenceIds: rating.evidenceIds,
      }
    })

    router.post(
      `/reviews/${sessionId}/submit`,
      {
        reviewerType,
        skillRatings,
        overallQualityScore: isManagerReview ? parseNumeric(overallQualityScore) : undefined,
        deliveryTimeliness: isManagerReview ? deliveryTimeliness : undefined,
        requirementAdherence: isManagerReview ? parseNumeric(requirementAdherence) : undefined,
        communicationQuality: isManagerReview ? parseNumeric(communicationQuality) : undefined,
        codeQualityScore: isManagerReview ? parseNumeric(codeQualityScore) : undefined,
        proactivenessScore: isManagerReview ? parseNumeric(proactivenessScore) : undefined,
        wouldWorkWithAgain: isManagerReview ? wouldWorkWithAgain === 'yes' : undefined,
        strengthsObserved: isManagerReview ? strengthsObserved || undefined : undefined,
        areasForImprovement: isManagerReview ? areasForImprovement || undefined : undefined,
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
      {t('task.reviews.skill_form.loading_context', {}, 'Loading requirements and rubric...')}
    </div>
  {:else if contextError}
    <div class="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-600">
      {contextError}
    </div>
  {/if}

  <div class="space-y-4">
    {#each reviewSkills() as skill (skill.id)}
      {@const rating = ratings[skill.id] ?? emptyRating()}
      {@const requirement = requirementsBySkill.get(skill.id)}
      {@const rubric = rubrics[skill.id] ?? null}
      <SkillRatingItem
        {skill}
        {rating}
        {requirement}
        {proficiencyLevels}
        {rubric}
        {evidences}
        {disabled}
        onUpdate={(patch: Partial<RatingDraft>) => updateRating(skill.id, patch)}
      />
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
    {submitting ? t('task.reviews.skill_form.submitting', {}, 'Submitting...') : t('task.reviews.skill_form.submit', {}, 'Submit review')}
  </Button>
</form>
