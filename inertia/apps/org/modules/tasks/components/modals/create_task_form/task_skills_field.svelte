<script lang="ts">
  import {
    getFrontendCanonicalProficiencyLevelLabel,
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
  import type { AvailableSkill, Skill } from '@/apps/shared/tasks/task_skills_types'
  import TaskSkillCategoryCard from './task_skill_category_card.svelte'
  import TaskSkillSelectedList from './task_skill_selected_list.svelte'

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

  function getLevelLabel(levelValue: string): string {
    const levelOption = proficiencyLevels.find((item) => item.value === levelValue)
    if (levelOption) {
      return levelOption.label
    }

    return getFrontendCanonicalProficiencyLevelLabel(
      levelValue,
      levelValue ? levelValue.toUpperCase() : 'Level'
    )
  }

  function getSkillCategoryCode(skill: Skill): TaskSkillCategoryCode {
    const directCategoryCode = skill.categoryCode ?? skill.category_code
    if (isTaskSkillCategoryCode(directCategoryCode)) {
      return directCategoryCode
    }

    const availableSkill = availableSkills.find((item) => item.id === skill.id)
    if (availableSkill && isTaskSkillCategoryCode(availableSkill.categoryCode)) {
      return availableSkill.categoryCode
    }

    return 'technology'
  }

  function getCategoryLabel(category: TaskSkillCategoryCode): string {
    return t(
      `task.skill_requirements.category.${category}`,
      {},
      TASK_SKILL_CATEGORY_LABELS[category]
    )
  }

  const groupedAvailableSkills = $derived(() => {
    const grouped: Record<TaskSkillCategoryCode, AvailableSkill[]> = {
      technology: [],
      engineering: [],
      soft_skill: [],
      delivery: [],
    }

    for (const skill of availableSkills) {
      const category = isTaskSkillCategoryCode(skill.categoryCode) ? skill.categoryCode : 'technology'
      grouped[category].push(skill)
    }

    for (const category of TASK_SKILL_CATEGORY_ORDER) {
      grouped[category].sort((first, second) => first.name.localeCompare(second.name))
    }

    return grouped
  })

  const groupedRequiredSkills = $derived(() => {
    const grouped: Record<TaskSkillCategoryCode, Skill[]> = {
      technology: [],
      engineering: [],
      soft_skill: [],
      delivery: [],
    }

    for (const skill of requiredSkills) {
      grouped[getSkillCategoryCode(skill)].push(skill)
    }

    return grouped
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
    const availableSkillHasRubric = Boolean(
      availableSkill?.rubricVersionId ?? availableSkill?.rubric_version_id
    )

    return Boolean(
      availableSkill &&
        availableSkill.projectSkillId &&
        getAllowedProficiencyLevels(category).length > 0 &&
        (!requireRubric || availableSkillHasRubric)
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
      <TaskSkillCategoryCard
        {category}
        categoryLabel={getCategoryLabel(category)}
        categoryMinimum={TASK_SKILL_CATEGORY_MINIMUMS[category]}
        categoryCount={categoryCounts()[category]}
        skillSearchValue={skillSearchByCategory[category]}
        onSearchInput={(value: string) => handleSearchInput(category, value)}
        selectedSkillId={selectedSkillIdByCategory[category]}
        onSelectSkillId={(skillId: string) => handleSelectAvailableSkillId(category, skillId)}
        filteredSkills={getFilteredAvailableSkills(category)}
        selectedLevel={selectedLevelByCategory[category]}
        onSelectLevel={(level: string) => {
          selectedLevelByCategory = {
            ...selectedLevelByCategory,
            [category]: level,
          }
        }}
        allowedLevels={getAllowedProficiencyLevels(category)}
        {getLevelLabel}
        addableSkill={getAddableAvailableSkill(category)}
        {requireRubric}
        canAdd={canAddSkill(category)}
        onAddSkill={() => handleAddSkill(category)}
      />
    {/each}
  </div>

  {#if error}
    <p id="required_skills-error" class="text-xs font-medium text-destructive" role="alert">{error}</p>
  {/if}

  <TaskSkillSelectedList
    groupedSkills={groupedRequiredSkills()}
    {getCategoryLabel}
    {getLevelLabel}
    {onRemoveSkill}
  />
</div>
