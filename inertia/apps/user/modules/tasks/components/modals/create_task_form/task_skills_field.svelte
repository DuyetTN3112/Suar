<script lang="ts">
  import { Search, X } from 'lucide-svelte'

  import Button from '@/apps/user/shared/ui/button.svelte'
  import Input from '@/apps/user/shared/ui/input.svelte'
  import {
    getFrontendCanonicalProficiencyLevelLabel,
    listFrontendCanonicalProficiencyLevelOptions,
  } from '@/apps/user/modules/profile/lib/proficiency_level_catalog'
  import {
    TASK_SKILL_CATEGORY_LABELS,
    TASK_SKILL_CATEGORY_MINIMUMS,
    TASK_SKILL_CATEGORY_ORDER,
    countTaskSkillsByCategory,
    isTaskSkillCategoryCode,
    type TaskSkillCategoryCode,
  } from '@/apps/user/modules/tasks/lib/rules/task_skill_category_rules'
  import { useTranslation } from '@/apps/user/shared/stores/translation.svelte'

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
    projectSkillId?: string | null
    name: string
    categoryCode?: string | null
    rubricVersionId?: string | null
    rubric_version_id?: string | null
    minimumTaskRequirementLevelId?: string | null
    maximumTaskRequirementLevelId?: string | null
    minimumTaskRequirementLevelCode?: string | null
    maximumTaskRequirementLevelCode?: string | null
  }

  interface Props {
    requiredSkills: Skill[]
    onAddSkill: (skill: Skill) => void
    onRemoveSkill: (skillId: string) => void
    availableSkills?: AvailableSkill[]
    proficiencyLevels?: { id?: string; value: string; label: string }[]
    error?: string
    required?: boolean
    requireRubric?: boolean
  }

  const {
    requiredSkills = [],
    onAddSkill,
    onRemoveSkill,
    availableSkills = [],
    error,
    required = false,
    requireRubric = false,
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
    const allowedLevels = getAllowedProficiencyLevels(category)
    const selectedLevel = selectedLevelByCategory[category]
    if (allowedLevels.some((level) => level.value === selectedLevel)) return selectedLevel
    return allowedLevels[0]?.value ?? ''
  }

  function getAllowedProficiencyLevels(
    category: TaskSkillCategoryCode
  ): { id?: string; value: string; label: string }[] {
    const skill = getAddableAvailableSkill(category)
    if (!skill?.minimumTaskRequirementLevelId || !skill.maximumTaskRequirementLevelId) {
      return []
    }
    const minimumIndex = proficiencyLevels.findIndex(
      (level) => level.id === skill.minimumTaskRequirementLevelId
    )
    const maximumIndex = proficiencyLevels.findIndex(
      (level) => level.id === skill.maximumTaskRequirementLevelId
    )
    if (minimumIndex < 0 || maximumIndex < minimumIndex) return []
    return proficiencyLevels.slice(minimumIndex, maximumIndex + 1)
  }

  function resetCategoryInput(category: TaskSkillCategoryCode) {
    selectedSkillIdByCategory = {
      ...selectedSkillIdByCategory,
      [category]: '',
    }
    selectedLevelByCategory = {
      ...selectedLevelByCategory,
      [category]: '',
    }
    skillSearchByCategory = {
      ...skillSearchByCategory,
      [category]: '',
    }
  }

  function canAddSkill(category: TaskSkillCategoryCode): boolean {
    const availableSkill = getAddableAvailableSkill(category)
    return Boolean(
      availableSkill &&
        availableSkill.projectSkillId &&
        getAllowedProficiencyLevels(category).length > 0
    )
  }

  $effect(() => {
    for (const category of TASK_SKILL_CATEGORY_ORDER) {
      const allowedLevels = getAllowedProficiencyLevels(category)
      if (
        allowedLevels.length > 0 &&
        !allowedLevels.some((level) => level.value === selectedLevelByCategory[category])
      ) {
        selectedLevelByCategory = {
          ...selectedLevelByCategory,
          [category]: allowedLevels[0]?.value ?? '',
        }
      }
    }
  })

  function handleAddSkill(category: TaskSkillCategoryCode) {
    const skill = getAddableAvailableSkill(category)

    if (!skill) {
      return
    }

    if (requiredSkills.some((requiredSkill) => requiredSkill.id === skill.id)) {
      resetCategoryInput(category)
      return
    }

    const selectedLevel = getSelectedLevel(category)
    const selectedLevelOption = proficiencyLevels.find((level) => level.value === selectedLevel)
    const maximumLevelOption = proficiencyLevels.find(
      (level) => level.id === skill.maximumTaskRequirementLevelId
    )

    onAddSkill({
      id: skill.id,
      name: skill.name,
      level: selectedLevel,
      categoryCode: category,
      project_skill_id: skill.projectSkillId ?? undefined,
      rubric_version_id: skill.rubricVersionId ?? skill.rubric_version_id ?? null,
      minimum_level_id: selectedLevelOption?.id,
      target_level_id: selectedLevelOption?.id,
      assessment_ceiling_level_id: skill.maximumTaskRequirementLevelId ?? undefined,
      minimum_level_code: selectedLevel,
      target_level_code: selectedLevel,
      assessment_ceiling_level_code:
        skill.maximumTaskRequirementLevelCode ?? maximumLevelOption?.value ?? null,
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
    const allowedLevels = getAllowedProficiencyLevels(category)
    selectedLevelByCategory = {
      ...selectedLevelByCategory,
      [category]: allowedLevels[0]?.value ?? '',
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

</script>

<div id="required-skills-field" tabindex="-1" class={`space-y-5 rounded-xl ${error ? 'ring-2 ring-destructive/30' : ''}`} data-demo-section="task-skills-field" aria-invalid={error ? 'true' : undefined} aria-describedby={error ? 'required_skills-error' : undefined}>
  <div class="flex items-center justify-between gap-3">
    <div>
      <h3 class="text-lg font-black text-foreground">
        Kỹ năng tối thiểu để nhận task
        {#if required}<span class="ml-1 text-[#ef4444]" aria-hidden="true">*</span>{/if}
      </h3>
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
              {#if TASK_SKILL_CATEGORY_MINIMUMS[category] === 0}
                Optional
              {:else}
                {categoryCounts()[category]}/{TASK_SKILL_CATEGORY_MINIMUMS[category]}+
              {/if}
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
                  <option
                    value={skill.id}
                    disabled={
                      !skill.projectSkillId ||
                      !skill.minimumTaskRequirementLevelId ||
                      !skill.maximumTaskRequirementLevelId
                    }
                  >
                    {skill.name}{!skill.minimumTaskRequirementLevelId || !skill.maximumTaskRequirementLevelId ? ' · Chưa cấu hình khoảng level tại Project' : ''}{requireRubric && !(skill.rubricVersionId ?? skill.rubric_version_id) ? ` · ${t('task.skill_requirements.no_published_rubric', {}, 'No published rubric')}` : ''}
                  </option>
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
                {#each getAllowedProficiencyLevels(category) as level (level.value)}
                  <option value={level.value}>{getLevelLabel(level.value)}</option>
                {/each}
              </select>
            </div>
          </div>

          {#if getAddableAvailableSkill(category) && getAllowedProficiencyLevels(category).length === 0}
            <p class="text-xs text-amber-700 dark:text-amber-300">
              Kỹ năng này chưa có khoảng level tại Project nên chưa thể dùng cho task.
            </p>
          {/if}
          {#if requireRubric && getAddableAvailableSkill(category) && !(getAddableAvailableSkill(category)?.rubricVersionId ?? getAddableAvailableSkill(category)?.rubric_version_id)}
            <p class="text-xs text-amber-700 dark:text-amber-300">
              Skill này chưa có rubric publish. Bạn vẫn có thể chọn để xem cấu hình, nhưng chưa thể đăng Task.
            </p>
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
    <p id="required_skills-error" class="text-xs font-medium text-destructive" role="alert">{error}</p>
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
                    {#if skill.minimum_level_id || skill.minimum_level_code}
                      <div class="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <span>Mức tối thiểu: {getLevelLabel(skill.level)}</span>
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
