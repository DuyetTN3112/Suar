<script lang="ts">
  import Label from '@/apps/org/shared/ui/label.svelte'
  import Textarea from '@/apps/org/shared/ui/textarea.svelte'
  import Select from '@/apps/org/shared/ui/select.svelte'
  import SelectContent from '@/apps/org/shared/ui/select_content.svelte'
  import SelectItem from '@/apps/org/shared/ui/select_item.svelte'
  import SelectTrigger from '@/apps/org/shared/ui/select_trigger.svelte'
  import SelectValue from '@/apps/org/shared/ui/select_value.svelte'
  import ProficiencyLevelBadge from '@/apps/org/modules/profile/components/proficiency_level_badge.svelte'
  import { useTranslation } from '@/apps/org/shared/stores/translation.svelte'
  import { findFrontendCanonicalProficiencyLevelOption } from '@/apps/org/modules/profile/lib/proficiency_level_catalog'

  interface SerializedSkill {
    id: string
    skill_name: string
    description?: string | null
    category_code: string
  }

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

  interface ReviewEvidenceItem {
    id: string
    evidenceType: string
    url: string | null
    title?: string | null
    description?: string | null
  }

  interface ProficiencyLevelOption {
    value: string
    labelVi: string
    colorHex: string
    minPercentage: number
    maxPercentage: number
  }

  interface Props {
    skill: SerializedSkill
    rating: RatingDraft
    requirement?: TaskRequirement
    proficiencyLevels: ProficiencyLevelOption[]
    rubric: SkillRubric | null
    evidences: ReviewEvidenceItem[]
    disabled?: boolean
    onUpdate: (patch: Partial<RatingDraft>) => void
  }

  let {
    skill,
    rating,
    requirement,
    proficiencyLevels,
    rubric,
    evidences,
    disabled = false,
    onUpdate,
  }: Props = $props()
  const { t } = useTranslation()

  const rubricLevel = $derived(
    rating.levelCode && rubric
      ? rubric.levels.find((level) => level.proficiencyLevel?.code === rating.levelCode) ?? null
      : null
  )

  function toggleBehavior(behavior: string) {
    const selected = new Set(rating.observableBehaviors)
    if (selected.has(behavior)) selected.delete(behavior)
    else selected.add(behavior)
    onUpdate({ observableBehaviors: [...selected] })
  }

  function toggleEvidence(evidenceId: string) {
    const selected = new Set(rating.evidenceIds)
    if (selected.has(evidenceId)) selected.delete(evidenceId)
    else selected.add(evidenceId)
    onUpdate({ evidenceIds: [...selected] })
  }

  function getCategoryLabel(categoryCode: string): string {
    return t(`task.reviews.skill_rating_item.category.${categoryCode}`, {}, categoryCode)
  }

  function getProficiencyLevelLabel(level: ProficiencyLevelOption): string {
    const canonicalLevel = findFrontendCanonicalProficiencyLevelOption(level.value)
    return t(
      `user.proficiency_levels.labels.${level.value}`,
      {},
      canonicalLevel?.label ?? level.labelVi
    )
  }
</script>

<div class="space-y-3 rounded-lg border p-4">
  <div>
    <h4 class="text-sm font-medium">{skill.skill_name}</h4>
    {#if skill.description}
      <p class="mt-0.5 text-xs text-muted-foreground">{skill.description}</p>
    {/if}
    <span class="mt-1 inline-block rounded bg-muted px-1.5 py-0.5 text-[10px] capitalize text-muted-foreground font-mono">
      {getCategoryLabel(skill.category_code)}
    </span>
  </div>

  {#if requirement}
    <div class="rounded-md border bg-muted/20 p-3 text-xs">
      <div class="mb-2 flex flex-wrap items-center gap-2">
        <span class="font-semibold text-foreground">{t('task.reviews.skill_rating_item.task_requirement', {}, 'Task requirement')}</span>
        {#if requirement.isMandatory}
          <span class="rounded border border-destructive/20 bg-destructive/10 px-1.5 py-0.5 font-bold uppercase text-destructive font-sans">{t('task.reviews.skill_rating_item.mandatory', {}, 'Mandatory')}</span>
        {/if}
        <span class="rounded border px-1.5 py-0.5 text-muted-foreground font-sans">{requirement.importance}</span>
        <span class="text-muted-foreground">{t('task.reviews.skill_rating_item.weight', { weight: requirement.weight }, `weight ${requirement.weight}`)}</span>
      </div>
      <div class="flex flex-wrap items-center gap-1.5">
        <span class="text-muted-foreground">{t('task.reviews.skill_rating_item.minimum', {}, 'Minimum')}</span>
        <ProficiencyLevelBadge level={requirement.minimumLevel} size="xs" />
        <span class="text-muted-foreground">{t('task.reviews.skill_rating_item.target', {}, 'Target')}</span>
        <ProficiencyLevelBadge level={requirement.targetLevel} size="xs" />
        <span class="text-muted-foreground">{t('task.reviews.skill_rating_item.assessment_ceiling', {}, 'Assessment ceiling')}</span>
        <ProficiencyLevelBadge level={requirement.assessmentCeilingLevel} size="xs" />
        {#if requirement.rubricVersion}
          <span class="ml-1 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground font-sans">
            rubric v{requirement.rubricVersion.version}
          </span>
        {/if}
      </div>
      {#if requirement.requirementNotes}
        <p class="mt-2 text-muted-foreground">{requirement.requirementNotes}</p>
      {/if}
    </div>
  {/if}

  <div class="space-y-2">
    <Label for="level-{skill.id}">{t('task.reviews.skill_rating_item.proficiency_label', {}, 'Proficiency level')}</Label>
    <Select
      type="single"
      value={rating.levelCode}
      onValueChange={(value: string) => {
        onUpdate({ levelCode: value })
      }}
    >
      <SelectTrigger class="w-full" disabled={disabled}>
        <SelectValue placeholder={t('task.reviews.skill_rating_item.proficiency_placeholder', {}, 'Choose level...')} />
      </SelectTrigger>
      <SelectContent>
        {#each proficiencyLevels as level (level.value)}
          <SelectItem value={level.value}>
            <div class="flex items-center gap-2">
              <span
                class="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                style="background-color: {level.colorHex}"
              ></span>
              <span>{getProficiencyLevelLabel(level)}</span>
              <span class="text-xs text-muted-foreground font-mono">
                ({level.minPercentage}-{level.maxPercentage}%)
              </span>
            </div>
          </SelectItem>
        {/each}
      </SelectContent>
    </Select>
  </div>

  {#if rubricLevel}
    <div class="rounded-md border border-border bg-secondary/40 p-3 text-xs text-foreground font-sans">
      <p class="font-semibold">{t('task.reviews.skill_rating_item.rubric_selected', { level: rubricLevel.proficiencyLevel?.displayName ?? '' }, `Rubric for selected level: ${rubricLevel.proficiencyLevel?.displayName ?? ''}`)}</p>
      {#if rubricLevel.summary}
        <p class="mt-1">{rubricLevel.summary}</p>
      {/if}
      {#if rubricLevel.observableBehaviors?.length}
        <p class="mt-2 font-semibold">{t('task.reviews.skill_rating_item.observable_behaviors', {}, 'Observable behaviors')}</p>
        <ul class="mt-1 space-y-1">
          {#each rubricLevel.observableBehaviors.slice(0, 3) as behavior}
            <li>
              <label class="flex items-start gap-2">
                <input
                  type="checkbox"
                  class="mt-0.5 h-3.5 w-3.5"
                  checked={rating.observableBehaviors.includes(behavior)}
                  onchange={() => toggleBehavior(behavior)}
                  disabled={disabled}
                />
                <span>{behavior}</span>
              </label>
            </li>
          {/each}
        </ul>
      {/if}
      {#if rubricLevel.evidenceGuidance}
        <p class="mt-2 text-foreground">{rubricLevel.evidenceGuidance}</p>
      {/if}
    </div>
  {/if}

  <div class="grid gap-3 sm:grid-cols-2">
    <div class="space-y-2">
      <Label for="confidence-{skill.id}">{t('task.reviews.skill_rating_item.confidence_label', {}, 'Evidence confidence')}</Label>
      <select
        id="confidence-{skill.id}"
        value={rating.confidence}
        onchange={(event) => {
          onUpdate({
            confidence: (event.target as HTMLSelectElement).value as RatingDraft['confidence'],
          })
        }}
        disabled={disabled}
        class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
      >
        <option value="">{t('task.reviews.skill_rating_item.confidence_unselected', {}, 'Not selected')}</option>
        <option value="low">{t('task.reviews.skill_rating_item.confidence_low', {}, 'Low')}</option>
        <option value="medium">{t('task.reviews.skill_rating_item.confidence_medium', {}, 'Medium')}</option>
        <option value="high">{t('task.reviews.skill_rating_item.confidence_high', {}, 'High')}</option>
      </select>
    </div>
    <label class="flex items-center gap-2 rounded-md border p-3 text-sm">
      <input
        type="checkbox"
        checked={rating.insufficientEvidence}
        onchange={(event) => {
          onUpdate({
            insufficientEvidence: (event.target as HTMLInputElement).checked,
          })
        }}
        disabled={disabled}
        class="h-4 w-4"
      />
      <span>{t('task.reviews.skill_rating_item.insufficient_evidence', {}, 'Insufficient evidence for selected level')}</span>
    </label>
  </div>

  <div class="space-y-2">
    <Label for="rationale-{skill.id}">{t('task.reviews.skill_rating_item.rationale_label', {}, 'Rationale')}</Label>
    <Textarea
      id="rationale-{skill.id}"
      value={rating.rationale}
      oninput={(event: Event) => {
        onUpdate({ rationale: (event.target as HTMLTextAreaElement).value })
      }}
      disabled={disabled}
      rows={2}
      placeholder={t('task.reviews.skill_rating_item.rationale_placeholder', {}, 'Why does this level fit the observed evidence?')}
    />
  </div>

  <div class="space-y-2">
    <Label>{t('task.reviews.skill_rating_item.evidence_linked', {}, 'Linked evidence')}</Label>
    {#if evidences.length === 0}
      <p class="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
        {t('task.reviews.skill_rating_item.no_evidence', {}, 'No evidence in this session yet.')}
      </p>
    {:else}
      <div class="grid gap-2 sm:grid-cols-2">
        {#each evidences as evidence (evidence.id)}
          <label class="flex items-start gap-2 rounded-md border p-2 text-xs">
            <input
              type="checkbox"
              class="mt-0.5 h-3.5 w-3.5"
              checked={rating.evidenceIds.includes(evidence.id)}
              onchange={() => toggleEvidence(evidence.id)}
              disabled={disabled}
            />
            <span>
              <span class="font-medium">{evidence.title ?? evidence.evidenceType}</span>
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
    <Label for="comment-{skill.id}">{t('task.reviews.skill_rating_item.comment_label', {}, 'Comment')}</Label>
    <Textarea
      id="comment-{skill.id}"
      value={rating.comment}
      oninput={(event: Event) => {
        onUpdate({ comment: (event.target as HTMLTextAreaElement).value })
      }}
      placeholder={t('task.reviews.skill_rating_item.comment_placeholder', {}, 'Specific observations about this skill...')}
      rows={2}
      disabled={disabled}
      class="resize-none"
    />
  </div>
</div>
