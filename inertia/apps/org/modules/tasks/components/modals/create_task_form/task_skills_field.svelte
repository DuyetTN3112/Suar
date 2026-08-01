<script lang="ts">
  import { Plus, Search, X } from 'lucide-svelte'

  import Button from '@/apps/org/shared/ui/button.svelte'
  import Input from '@/apps/org/shared/ui/input.svelte'
  import {
    getFrontendCanonicalProficiencyLevelLabel,
    getFrontendPreferredTaskRequirementLevelValue,
    listFrontendCanonicalProficiencyLevelOptions,
  } from '@/apps/org/modules/profile/lib/proficiency_level_catalog'
  import {
    TASK_SKILL_CATEGORY_LABELS,
    TASK_SKILL_CATEGORY_MINIMUMS,
    TASK_SKILL_CATEGORY_ORDER,
    countTaskSkillsByCategory,
    isTaskSkillCategoryCode,
    type TaskSkillCategoryCode,
  } from '@/apps/org/modules/tasks/lib/rules/task_skill_category_rules'
  import { useTranslation } from '@/apps/org/shared/stores/translation.svelte'

  interface Skill {
    id: string
    name: string
    level: string
    categoryCode?: string | null
    custom_name?: string
    category_code?: string | null
    project_skill_id?: string
    source_project_professional_role_id?: string
    source_role_skill_id?: string
    minimum_level_id?: string
    target_level_id?: string
    assessment_ceiling_level_id?: string
    rubric_version_id?: string | null
    minimum_level_code?: string | null
    target_level_code?: string | null
    assessment_ceiling_level_code?: string | null
    is_mandatory?: boolean
    importance?: string
    weight?: number
    requirement_source?: string
    requirement_notes?: string
  }

  interface AvailableSkill {
    id: string
    name: string
    categoryCode?: string | null
    rubricVersionId?: string | null
    rubric_version_id?: string | null
  }

  interface Props {
    requiredSkills: Skill[]
    onAddSkill: (skill: Skill) => void
    onRemoveSkill: (skillId: string) => void
    availableSkills?: AvailableSkill[]
    proficiencyLevels?: { value: string; label: string }[]
    error?: string
  }

  const {
    requiredSkills = [],
    onAddSkill,
    onRemoveSkill,
    availableSkills = [],
    error,
    proficiencyLevels = listFrontendCanonicalProficiencyLevelOptions().map(({ value, label }) => ({
      value,
      label,
    })),
  }: Props = $props()

  let selectedSkillIdByCategory = $state<Record<TaskSkillCategoryCode, string>>({
    technology: '',
    engineering: '',
    soft_skill: '',
    delivery: '',
  })
  let selectedLevelByCategory = $state<Record<TaskSkillCategoryCode, string>>({
    technology: '',
    engineering: '',
    soft_skill: '',
    delivery: '',
  })
  let skillSearchByCategory = $state<Record<TaskSkillCategoryCode, string>>({
    technology: '',
    engineering: '',
    soft_skill: '',
    delivery: '',
  })
  const { t } = useTranslation()

  const sourceLabels: Record<string, string> = {
    manual: 'Manual',
    professional_role_prefill: 'Role prefill',
    template: 'Template',
    copied_task: 'Copied task',
    imported_legacy: 'Imported legacy',
  }

  const importanceTone: Record<string, string> = {
    low: 'bg-muted text-foreground',
    medium: 'bg-muted text-foreground',
    high: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
    critical: 'bg-destructive/10 text-destructive',
  }

  function getCategoryLabel(category: TaskSkillCategoryCode): string {
    return t(
      `task.skill_requirements.categories.${category}`,
      {},
      TASK_SKILL_CATEGORY_LABELS[category]
    )
  }

  function getLevelLabel(levelValue: string): string {
    const fallback =
      proficiencyLevels.find((level) => level.value === levelValue)?.label ??
      getFrontendCanonicalProficiencyLevelLabel(levelValue, levelValue)

    return t(`user.proficiency_levels.labels.${levelValue}`, {}, fallback)
  }

  function getSkillRangeLabel(skill: Skill): string | null {
    const min = getRequirementLevelLabel(skill.minimum_level_code, skill.minimum_level_id)
    const target = getRequirementLevelLabel(skill.target_level_code, skill.target_level_id)
    const ceiling = getRequirementLevelLabel(
      skill.assessment_ceiling_level_code,
      skill.assessment_ceiling_level_id
    )

    if (min && target) return `${min} - ${target}`
    if (min && ceiling) return `${min} - ${ceiling}`
    if (target) return target
    if (min) return min
    if (ceiling) return `<= ${ceiling}`
    return null
  }

  function getRequirementLevelLabel(
    code: string | null | undefined,
    id: string | null | undefined
  ): string | null {
    if (code) return code.toUpperCase()
    if (id) return id
    return null
  }

  function getRequirementSourceLabel(source: string | undefined): string | null {
    if (!source) return null
    return t(`task.skill_requirements.source.${source}`, {}, sourceLabels[source] ?? source)
  }

  function getSkillCategoryCode(skill: Skill): TaskSkillCategoryCode | null {
    if (isTaskSkillCategoryCode(skill.categoryCode)) {
      return skill.categoryCode
    }

    const matchedSkill = availableSkills.find((availableSkill) => availableSkill.id === skill.id)
    const categoryCode = matchedSkill?.categoryCode

    if (isTaskSkillCategoryCode(categoryCode)) {
      return categoryCode
    }

    return null
  }

  const groupedRequiredSkills = $derived(() => {
    const initial: Record<TaskSkillCategoryCode, Skill[]> = {
      technology: [],
      engineering: [],
      soft_skill: [],
      delivery: [],
    }

    for (const skill of requiredSkills) {
      const categoryCode = getSkillCategoryCode(skill)
      if (!categoryCode) continue
      initial[categoryCode].push({
        ...skill,
        categoryCode,
      })
    }

    return initial
  })

  const groupedAvailableSkills = $derived(() => {
    const initial: Record<TaskSkillCategoryCode, AvailableSkill[]> = {
      technology: [],
      engineering: [],
      soft_skill: [],
      delivery: [],
    }
    const seenSkillNames: Record<TaskSkillCategoryCode, Set<string>> = {
      technology: new Set(),
      engineering: new Set(),
      soft_skill: new Set(),
      delivery: new Set(),
    }

    for (const skill of availableSkills) {
      if (isTaskSkillCategoryCode(skill.categoryCode)) {
        const normalizedSkillName = normalizeSkillSearchValue(skill.name)
        if (seenSkillNames[skill.categoryCode].has(normalizedSkillName)) continue
        seenSkillNames[skill.categoryCode].add(normalizedSkillName)
        initial[skill.categoryCode].push(skill)
      }
    }

    return initial
  })

  const categoryCounts = $derived(() =>
    countTaskSkillsByCategory(requiredSkills.map((skill) => getSkillCategoryCode(skill)))
  )

  function normalizeSkillSearchValue(value: string): string {
    return value.trim().replace(/\s+/g, ' ').toLowerCase()
  }

  function createCustomSkillId(category: TaskSkillCategoryCode, name: string): string {
    const slug =
      name
        .trim()
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'custom-skill'

    return `custom:${category}:${slug}`
  }

  function getFilteredAvailableSkills(category: TaskSkillCategoryCode): AvailableSkill[] {
    const query = normalizeSkillSearchValue(skillSearchByCategory[category])
    const skills = groupedAvailableSkills()[category]

    if (!query) return skills

    return skills.filter((skill) => normalizeSkillSearchValue(skill.name).includes(query))
  }

  function getSelectedAvailableSkill(category: TaskSkillCategoryCode): AvailableSkill | undefined {
    return groupedAvailableSkills()[category].find(
      (skill) => skill.id === selectedSkillIdByCategory[category]
    )
  }

  function getExactAvailableSkillMatch(category: TaskSkillCategoryCode): AvailableSkill | undefined {
    const query = normalizeSkillSearchValue(skillSearchByCategory[category])
    if (!query) return undefined

    return groupedAvailableSkills()[category].find(
      (skill) => normalizeSkillSearchValue(skill.name) === query
    )
  }

  function getSingleFilteredAvailableSkillMatch(
    category: TaskSkillCategoryCode
  ): AvailableSkill | undefined {
    const query = normalizeSkillSearchValue(skillSearchByCategory[category])
    if (!query) return undefined

    const filteredSkills = getFilteredAvailableSkills(category)
    return filteredSkills.length === 1 ? filteredSkills[0] : undefined
  }

  function getAddableAvailableSkill(category: TaskSkillCategoryCode): AvailableSkill | undefined {
    return (
      getSelectedAvailableSkill(category) ??
      getExactAvailableSkillMatch(category) ??
      getSingleFilteredAvailableSkillMatch(category)
    )
  }

  function getSelectedLevel(category: TaskSkillCategoryCode): string {
    return (
      selectedLevelByCategory[category] ||
      getFrontendPreferredTaskRequirementLevelValue(proficiencyLevels)
    )
  }

  function getCustomSkillName(category: TaskSkillCategoryCode): string {
    const name = skillSearchByCategory[category].trim().replace(/\s+/g, ' ')
    const normalizedName = normalizeSkillSearchValue(name)

    if (!normalizedName) return ''
    if (getAddableAvailableSkill(category)) return ''

    const catalogHasExactMatch = groupedAvailableSkills()[category].some(
      (skill) => normalizeSkillSearchValue(skill.name) === normalizedName
    )
    const selectedHasExactMatch = requiredSkills.some(
      (skill) => normalizeSkillSearchValue(skill.name) === normalizedName
    )

    return catalogHasExactMatch || selectedHasExactMatch ? '' : name
  }

  function resetCategoryInput(category: TaskSkillCategoryCode) {
    selectedSkillIdByCategory = {
      ...selectedSkillIdByCategory,
      [category]: '',
    }
    selectedLevelByCategory = {
      ...selectedLevelByCategory,
      [category]: getFrontendPreferredTaskRequirementLevelValue(proficiencyLevels),
    }
    skillSearchByCategory = {
      ...skillSearchByCategory,
      [category]: '',
    }
  }

  function canAddSkill(category: TaskSkillCategoryCode): boolean {
    return Boolean(getAddableAvailableSkill(category) || getCustomSkillName(category))
  }

  $effect(() => {
    const preferredLevel = getFrontendPreferredTaskRequirementLevelValue(proficiencyLevels)

    for (const category of TASK_SKILL_CATEGORY_ORDER) {
      if (
        proficiencyLevels.length > 0 &&
        !proficiencyLevels.some((level) => level.value === selectedLevelByCategory[category])
      ) {
        selectedLevelByCategory = {
          ...selectedLevelByCategory,
          [category]: preferredLevel,
        }
      }
    }
  })

  function handleAddSkill(category: TaskSkillCategoryCode) {
    const skill = getAddableAvailableSkill(category)

    if (!skill) {
      handleAddCustomSkill(category)
      return
    }

    if (requiredSkills.some((requiredSkill) => requiredSkill.id === skill.id)) {
      resetCategoryInput(category)
      return
    }

    onAddSkill({
      id: skill.id,
      name: skill.name,
      level: getSelectedLevel(category),
      categoryCode: category,
      rubric_version_id: skill.rubricVersionId ?? skill.rubric_version_id ?? null,
    })

    resetCategoryInput(category)
  }

  function handleSelectAvailableSkillId(category: TaskSkillCategoryCode, skillId: string) {
    const selectedSkill = groupedAvailableSkills()[category].find((skill) => skill.id === skillId)

    selectedSkillIdByCategory = {
      ...selectedSkillIdByCategory,
      [category]: skillId,
    }

    if (!selectedSkill) return

    skillSearchByCategory = {
      ...skillSearchByCategory,
      [category]: selectedSkill.name,
    }
  }

  function handleSearchInput(category: TaskSkillCategoryCode, value: string) {
    skillSearchByCategory = {
      ...skillSearchByCategory,
      [category]: value,
    }

    const selectedSkill = getSelectedAvailableSkill(category)
    if (selectedSkill && normalizeSkillSearchValue(selectedSkill.name) !== normalizeSkillSearchValue(value)) {
      selectedSkillIdByCategory = {
        ...selectedSkillIdByCategory,
        [category]: '',
      }
    }
  }

  function handleAddCustomSkill(category: TaskSkillCategoryCode) {
    const customName = getCustomSkillName(category)
    if (!customName) return

    const customSkillId = createCustomSkillId(category, customName)
    if (requiredSkills.some((skill) => skill.id === customSkillId)) {
      resetCategoryInput(category)
      return
    }

    onAddSkill({
      id: customSkillId,
      name: customName,
      level: getSelectedLevel(category),
      categoryCode: category,
      custom_name: customName,
      category_code: category,
      requirement_source: 'manual',
    })

    resetCategoryInput(category)
  }
</script>

<div class="space-y-5" data-demo-section="task-skills-field">
  <div class="flex items-center justify-between gap-3">
    <div>
      <p class="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">{t('task.skill_requirements.eyebrow', {}, 'Task requirements')}</p>
      <h3 class="mt-1 text-lg font-black text-foreground">{t('task.skill_requirements.inherited_skills', {}, 'Inherited skills')}</h3>
    </div>
    <span class="rounded-full border border-border bg-secondary px-3 py-1 text-xs font-bold text-muted-foreground">
      {t('task.skill_requirements.skill_count', { count: requiredSkills.length }, ':count skills')}
    </span>
  </div>

  <div class="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
    {#each TASK_SKILL_CATEGORY_ORDER as category (category)}
      <section class="rounded-xl border bg-background/80 p-4">
        <div class="mb-3">
          <div class="flex items-center justify-between gap-3">
            <div class="text-sm font-semibold text-foreground">
              {getCategoryLabel(category)}
            </div>
            <span class="rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
              {categoryCounts()[category]}/{TASK_SKILL_CATEGORY_MINIMUMS[category]}+
            </span>
          </div>
        </div>

        <div class="space-y-3">
          <div class="space-y-2">
            <div class="min-w-0 space-y-2">
              <label class="sr-only" for={`skill-search-${category}`}>
                {t('task.skill_requirements.search_category_label', { category: getCategoryLabel(category) }, 'Search :category skills')}
              </label>
              <div class="relative">
                <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id={`skill-search-${category}`}
                  value={skillSearchByCategory[category]}
                  class="pl-9"
                  placeholder={t('task.skill_requirements.search_placeholder', {}, 'Search or enter a skill...')}
                  oninput={(event: Event) => {
                    handleSearchInput(category, (event.target as HTMLInputElement).value)
                  }}
                />
              </div>
            </div>
          </div>

          <div class="grid gap-3">
            <div class="space-y-1.5">
              <label
                class="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground"
                for={`skill-select-${category}`}
              >
                {t('task.skill_requirements.skill_category_label', { category: getCategoryLabel(category) }, ':category skill')}
              </label>
              <select
                id={`skill-select-${category}`}
                value={selectedSkillIdByCategory[category]}
                class="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-medium text-foreground shadow-suar-hairline focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:opacity-50"
                onchange={(event: Event) => {
                  handleSelectAvailableSkillId(category, (event.target as HTMLSelectElement).value)
                }}
              >
                <option value="">{t('task.skill_requirements.choose_skill', {}, 'Choose skill...')}</option>
                {#each getFilteredAvailableSkills(category) as skill (skill.id)}
                  <option value={skill.id}>{skill.name}</option>
                {/each}
              </select>
            </div>

            <div class="space-y-1.5">
              <label
                class="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground"
                for={`level-select-${category}`}
              >
                {t('task.skill_requirements.level_category_label', { category: getCategoryLabel(category) }, ':category level')}
              </label>
              <select
                id={`level-select-${category}`}
                value={selectedLevelByCategory[category]}
                class="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-medium text-foreground shadow-suar-hairline focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:opacity-50"
                onchange={(event: Event) => {
                  selectedLevelByCategory = {
                    ...selectedLevelByCategory,
                    [category]: (event.target as HTMLSelectElement).value,
                  }
                }}
              >
                {#each proficiencyLevels as level (level.value)}
                  <option value={level.value}>{getLevelLabel(level.value)}</option>
                {/each}
              </select>
            </div>
          </div>

          {#if getCustomSkillName(category)}
            <Button
              type="button"
              size="sm"
              variant="outline"
              class="w-full justify-start"
              onclick={() => {
                handleAddCustomSkill(category)
              }}
            >
              <Plus class="h-4 w-4" />
              {t('task.skill_requirements.add_custom_skill', { skillName: getCustomSkillName(category) }, 'Add custom skill: :skillName')}
            </Button>
          {/if}

          <Button
            type="button"
            size="sm"
            variant="outline"
            class="w-full"
            aria-label={t('task.skill_requirements.add_category_label', { category: getCategoryLabel(category) }, 'Add :category')}
            disabled={!canAddSkill(category)}
            onclick={() => {
              handleAddSkill(category)
            }}
          >
            {t('task.skill_requirements.add_button', {}, 'Add')}
          </Button>
        </div>
      </section>
    {/each}
  </div>

  {#if error}
    <p class="text-xs text-destructive">{error}</p>
  {/if}

  <div class="space-y-4">
    {#each TASK_SKILL_CATEGORY_ORDER as category (category)}
      <section class="space-y-2">
        <div class="flex items-center justify-between gap-3">
          <div class="text-sm font-medium text-foreground">
            {getCategoryLabel(category)}
          </div>
          <span class="text-xs text-muted-foreground">
            {t('task.skill_requirements.selected_skill_count', { count: groupedRequiredSkills()[category].length }, ':count selected skills')}
          </span>
        </div>

        {#if groupedRequiredSkills()[category].length === 0}
          <div class="rounded-xl border border-dashed bg-muted/10 px-3 py-4 text-sm text-muted-foreground">
            {t('task.skill_requirements.group_empty', {}, 'No skills in this group yet.')}
          </div>
        {:else}
          <div class="space-y-2">
            {#each groupedRequiredSkills()[category] as skill (skill.id)}
              <div class="rounded-xl border bg-card p-3">
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0 text-sm">
                    <div class="flex flex-wrap items-center gap-2">
                      <span class="font-medium">{skill.name}</span>
                      <span class="text-muted-foreground">· {getLevelLabel(skill.level)}</span>
                      {#if getRequirementSourceLabel(skill.requirement_source)}
                        <span class="rounded-full border border-border bg-card px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                          {getRequirementSourceLabel(skill.requirement_source)}
                        </span>
                      {/if}
                      {#if skill.is_mandatory}
                        <span class="rounded-full border border-border bg-card px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-foreground">
                          {t('task.skill_requirements.mandatory', {}, 'Mandatory')}
                        </span>
                      {/if}
                      {#if skill.importance}
                        <span class={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${importanceTone[skill.importance] ?? 'bg-muted text-foreground'}`}>
                          {t(`ui_misc.tasks.importance.${skill.importance}`, {}, skill.importance)}
                        </span>
                      {/if}
                      {#if getSkillRangeLabel(skill)}
                        <span class="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-foreground">
                          {t('task.skill_requirements.range_label', { range: getSkillRangeLabel(skill) }, 'Range :range')}
                        </span>
                      {/if}
                      {#if typeof skill.weight === 'number'}
                        <span class="rounded-full border border-border bg-card px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                          {t('task.skill_requirements.weight_value', { weight: skill.weight }, 'Weight :weight')}
                        </span>
                      {/if}
                    </div>

                    {#if skill.requirement_notes}
                      <p class="mt-2 text-xs text-muted-foreground">
                        {skill.requirement_notes}
                      </p>
                    {/if}
                    {#if skill.minimum_level_id || skill.minimum_level_code || skill.target_level_id || skill.target_level_code || skill.assessment_ceiling_level_id || skill.assessment_ceiling_level_code}
                      <div class="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                        {#if getRequirementLevelLabel(skill.minimum_level_code, skill.minimum_level_id)}
                          <span>{t('task.skill_requirements.min_label', {}, 'Min')}: {getRequirementLevelLabel(skill.minimum_level_code, skill.minimum_level_id)}</span>
                        {/if}
                        {#if getRequirementLevelLabel(skill.target_level_code, skill.target_level_id)}
                          <span>{t('task.skill_requirements.target_label', {}, 'Target')}: {getRequirementLevelLabel(skill.target_level_code, skill.target_level_id)}</span>
                        {/if}
                        {#if getRequirementLevelLabel(skill.assessment_ceiling_level_code, skill.assessment_ceiling_level_id)}
                          <span>{t('task.skill_requirements.ceiling_label', {}, 'Ceiling')}: {getRequirementLevelLabel(skill.assessment_ceiling_level_code, skill.assessment_ceiling_level_id)}</span>
                        {/if}
                      </div>
                    {/if}
                  </div>
                  <div class="shrink-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      onclick={() => {
                        onRemoveSkill(skill.id)
                      }}
                    >
                      <X class="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </section>
    {/each}
  </div>
</div>
