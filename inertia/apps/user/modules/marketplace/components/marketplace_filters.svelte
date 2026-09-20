<script lang="ts">
  /**
   * MarketplaceFilters — filter bar for marketplace task listing.
   * Emits changes via Inertia router.get to reload with server-side filtering.
  */
  import { router } from '@inertiajs/svelte'
  import { onMount } from 'svelte'

  import FilterDrawer from '@/apps/shared/filtering/components/filter_drawer.svelte'
  import { useTranslation } from '@/apps/user/shared/stores/translation.svelte'
  import MarketplaceAdvancedFilters from './marketplace_advanced_filters.svelte'
  import {
    SORT_OPTIONS,
    type MarketplaceFilters as Filters,
    type SerializedSkill,
  } from '../types.svelte'

  interface Props {
    filters: Filters
    availableSkills?: SerializedSkill[]
    allowRecommendedSort?: boolean
  }

  const props: Props = $props()
  const filters = $derived(props.filters)
  const availableSkills = $derived(props.availableSkills ?? [])
  const allowRecommendedSort = $derived(props.allowRecommendedSort ?? true)
  const { t } = useTranslation()

  const skillCategoryOptions = $derived([
    { value: 'technology', label: t('task.marketplace_filters.skill_category.technology', {}, 'Technology') },
    { value: 'engineering', label: t('task.marketplace_filters.skill_category.engineering', {}, 'Software engineering') },
    { value: 'soft_skill', label: t('task.marketplace_filters.skill_category.soft_skill', {}, 'Soft skills') },
    { value: 'delivery', label: t('task.marketplace_filters.skill_category.delivery', {}, 'Delivery') },
  ] as const)

  let keyword = $state('')
  let selectedSkillCategories = $state<string[]>([])
  let selectedSkillIds = $state<string[]>([])
  let skillMatch = $state<'any' | 'all'>('any')
  let difficulty = $state('')
  let taskType = $state('')
  let businessDomain = $state('')
  let problemCategory = $state('')
  let roleInTask = $state('')
  let verificationMethod = $state('')
  let techStack = $state('')
  let domainTags = $state('')
  let acceptingApplications = $state('')
  let sortBy = $state('created_at')
  let sortOrder = $state('desc')
  let validationError = $state('')
  let advancedOpen = $state(false)
  let mobileDrawerOpen = $state(false)
  let isMobile = $state(false)

  function syncDraftFromFilters(): void {
    keyword = filters.keyword ?? ''
    selectedSkillCategories = filters.skill_categories ?? []
    selectedSkillIds = filters.skill_ids ?? []
    skillMatch = filters.skill_match ?? 'any'
    difficulty = filters.difficulty ?? ''
    taskType = filters.task_type ?? ''
    businessDomain = filters.business_domain ?? ''
    problemCategory = filters.problem_category ?? ''
    roleInTask = filters.role_in_task ?? ''
    verificationMethod = filters.verification_method ?? ''
    techStack = filters.tech_stack ?? ''
    domainTags = filters.domain_tags ?? ''
    acceptingApplications = filters.accepting_applications ?? ''
    sortBy = !allowRecommendedSort && filters.sort_by === 'recommended' ? 'created_at' : filters.sort_by
    sortOrder = filters.sort_order
  }

  function filterSignature(values: {
    keyword?: string | null
    skillCategories?: readonly string[] | null
    skillIds?: readonly string[] | null
    skillMatch?: 'any' | 'all' | null
    difficulty?: string | null
    taskType?: string | null
    businessDomain?: string | null
    problemCategory?: string | null
    roleInTask?: string | null
    verificationMethod?: string | null
    techStack?: string | null
    domainTags?: string | null
    acceptingApplications?: string | null
    sortBy: string
    sortOrder: string
  }): string {
    return JSON.stringify({
      keyword: values.keyword?.trim() ?? '',
      skillCategories: [...(values.skillCategories ?? [])].sort(),
      skillIds: [...(values.skillIds ?? [])].sort(),
      skillMatch: values.skillMatch ?? 'any',
      difficulty: values.difficulty ?? '',
      taskType: values.taskType ?? '',
      businessDomain: values.businessDomain ?? '',
      problemCategory: values.problemCategory ?? '',
      roleInTask: values.roleInTask ?? '',
      verificationMethod: values.verificationMethod ?? '',
      techStack: values.techStack?.trim() ?? '',
      domainTags: values.domainTags?.trim() ?? '',
      acceptingApplications: values.acceptingApplications ?? '',
      sortBy: values.sortBy,
      sortOrder: values.sortOrder,
    })
  }

  onMount(() => {
    const mediaQuery = window.matchMedia('(max-width: 767px)')
    const updateViewport = () => {
      isMobile = mediaQuery.matches
      if (!isMobile) mobileDrawerOpen = false
    }
    updateViewport()
    mediaQuery.addEventListener('change', updateViewport)
    return () => mediaQuery.removeEventListener('change', updateViewport)
  })

  $effect(() => {
    syncDraftFromFilters()
  })

  function skillsForCategories(categories: string[]): SerializedSkill[] {
    return categories.length === 0
      ? availableSkills
      : availableSkills.filter((skill) => categories.includes(skill.category_code ?? ''))
  }

  const filteredAvailableSkills = $derived(skillsForCategories(selectedSkillCategories))

  function categoryLabel(categoryCode?: string | null): string {
    return (
      skillCategoryOptions.find((option) => option.value === categoryCode)?.label ??
      categoryCode ??
      t('task.marketplace_filters.other_category', {}, 'Other')
    )
  }

  function skillOptionLabel(skill: SerializedSkill): string {
    const label = `${skill.skill_name}${skill.category_code ? ` · ${categoryLabel(skill.category_code)}` : ''}`
    return isMobile && label.length > 30 ? `${label.slice(0, 27)}…` : label
  }

  function validateFilters(): boolean {
    validationError = ''
    return true
  }

  function applyFilters(): Promise<void> {
    if (!validateFilters()) {
      return Promise.resolve()
    }

    const params: Record<string, string | number | string[]> = {
      sort_by: sortBy,
      sort_order: sortOrder,
    }
    if (selectedSkillCategories.length) {
      Object.assign(params, { skill_categories: selectedSkillCategories })
    }
    if (selectedSkillIds.length) {
      Object.assign(params, { skill_ids: selectedSkillIds })
      Object.assign(params, { skill_match: skillMatch })
    }
    if (keyword.trim()) params.keyword = keyword.trim()
    if (difficulty) params.difficulty = difficulty
    if (taskType) params.task_type = taskType
    if (businessDomain) params.business_domain = businessDomain
    if (problemCategory) params.problem_category = problemCategory
    if (roleInTask) params.role_in_task = roleInTask
    if (verificationMethod) params.verification_method = verificationMethod
    if (techStack.trim()) params.tech_stack = techStack.trim()
    if (domainTags.trim()) params.domain_tags = domainTags.trim()
    if (acceptingApplications) params.accepting_applications = acceptingApplications

    return new Promise((resolve) => {
      router.get('/marketplace/tasks', params, {
        preserveScroll: true,
        preserveState: true,
        replace: false,
        onFinish: () => resolve(),
      })
    })
  }

  function clearFilters() {
    keyword = ''
    selectedSkillCategories = []
    selectedSkillIds = []
    skillMatch = 'any'
    difficulty = ''
    taskType = ''
    businessDomain = ''
    problemCategory = ''
    roleInTask = ''
    verificationMethod = ''
    techStack = ''
    domainTags = ''
    acceptingApplications = ''
    sortBy = 'created_at'
    sortOrder = 'desc'
    validationError = ''
    if (isMobile) return
    router.get('/marketplace/tasks', {}, { preserveScroll: true })
  }

  const hasDraftChanges = $derived(
    filterSignature({
      keyword,
      skillCategories: selectedSkillCategories,
      skillIds: selectedSkillIds,
      skillMatch,
      difficulty,
      taskType,
      businessDomain,
      problemCategory,
      roleInTask,
      verificationMethod,
      techStack,
      domainTags,
      acceptingApplications,
      sortBy,
      sortOrder,
    }) !==
      filterSignature({
        keyword: filters.keyword,
        skillCategories: filters.skill_categories,
        skillIds: filters.skill_ids,
        skillMatch: filters.skill_match,
        difficulty: filters.difficulty,
        taskType: filters.task_type,
        businessDomain: filters.business_domain,
        problemCategory: filters.problem_category,
        roleInTask: filters.role_in_task,
        verificationMethod: filters.verification_method,
        techStack: filters.tech_stack,
        domainTags: filters.domain_tags,
        acceptingApplications: filters.accepting_applications,
        sortBy: !allowRecommendedSort && filters.sort_by === 'recommended' ? 'created_at' : filters.sort_by,
        sortOrder: filters.sort_order,
      })
  )

  const hasActiveFilters = $derived(
    selectedSkillCategories.length > 0 ||
      selectedSkillIds.length > 0 ||
      (selectedSkillIds.length > 0 && skillMatch !== 'any') ||
      !!keyword.trim() ||
      !!difficulty ||
      !!taskType ||
      !!businessDomain ||
      !!problemCategory ||
      !!roleInTask ||
      !!verificationMethod ||
      !!techStack.trim() ||
      !!domainTags.trim() ||
      !!acceptingApplications ||
      sortBy !== 'created_at' ||
      sortOrder !== 'desc'
  )

  const visibleSortOptions = $derived<Array<{ value: string; label: string }>>(
    allowRecommendedSort
      ? [...SORT_OPTIONS]
      : SORT_OPTIONS.filter((option) => option.value !== 'recommended').map((option) => ({ ...option }))
  )

  function setSkillCategory(category: string, checked: boolean) {
    selectedSkillCategories = checked
      ? [...new Set([...selectedSkillCategories, category])]
      : selectedSkillCategories.filter((selected) => selected !== category)

    if (selectedSkillCategories.length > 0) {
      const visibleSkillIds = new Set(
        skillsForCategories(selectedSkillCategories).map((skill) => skill.id)
      )
      selectedSkillIds = selectedSkillIds.filter((skillId) => visibleSkillIds.has(skillId))
    }
  }
</script>

<div class="mt-6 rounded-2xl border border-border bg-muted/20 p-4">
  <div class="grid items-end gap-3 lg:grid-cols-[minmax(220px,1fr)_auto_minmax(220px,0.7fr)_auto_auto]">
    <div class="space-y-1.5 flex flex-col min-w-0">
      <label for="marketplace-keyword-filter" class="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
        {t('task.marketplace_filters.keyword_label', {}, 'Find tasks')}
      </label>
      <input
        id="marketplace-keyword-filter"
        class="flex h-10 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm transition-all focus:border-foreground focus:outline-hidden"
        type="search"
        placeholder={t('task.marketplace_filters.keyword_placeholder', {}, 'Task name, description, business domain...')}
        bind:value={keyword}
        onkeydown={(event: KeyboardEvent) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            applyFilters()
          }
        }}
      />
    </div>

    <div class="space-y-1.5 flex flex-col">
      <span class="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
        {t('task.marketplace_filters.skill_categories', {}, 'Skill groups')}
      </span>
      <div class="flex flex-wrap gap-2">
        {#each skillCategoryOptions as option (option.value)}
          {@const isSelected = selectedSkillCategories.includes(option.value)}
          <label
            class={`flex h-9 cursor-pointer items-center rounded-xl border px-3 text-xs font-bold transition-all ${
              isSelected
                ? 'border-foreground bg-foreground text-background'
                : 'border-border bg-background text-muted-foreground hover:bg-muted/50 hover:text-foreground'
            }`}
          >
            <input
              class="sr-only"
              type="checkbox"
              checked={isSelected}
              aria-label={option.label}
              onchange={(event) => setSkillCategory(option.value, event.currentTarget.checked)}
            />
            {option.label}
          </label>
        {/each}
      </div>
    </div>

    <div class="space-y-1.5 flex flex-col min-w-0">
      <label for="skill-filter" class="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
        {t('task.marketplace_filters.skill_label', {}, 'Skill')}
      </label>
      <div class="w-full min-w-0 max-w-full overflow-hidden">
        <select
          id="skill-filter"
          class="flex h-10 w-full max-w-full min-w-0 overflow-hidden rounded-xl border border-border bg-background px-3 py-2 text-sm transition-all focus:border-foreground focus:outline-hidden cursor-pointer"
          style="contain: inline-size paint"
          multiple
          size="4"
          onchange={(event) => {
            selectedSkillIds = Array.from(event.currentTarget.selectedOptions).map(({ value }) => value)
          }}
        >
          {#each filteredAvailableSkills as skill (skill.id)}
            <option value={skill.id}>
              {skillOptionLabel(skill)}
            </option>
          {/each}
        </select>
      </div>
      {#if selectedSkillIds.length > 0}
        <label for="skill-match-filter" class="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
          {t('task.marketplace_filters.skill_match', {}, 'Skill match')}
        </label>
        <select
          id="skill-match-filter"
          class="flex h-10 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm transition-all focus:border-foreground focus:outline-hidden cursor-pointer"
          bind:value={skillMatch}
        >
          <option value="any">{t('task.marketplace_filters.skill_match_any', {}, 'Any skill')}</option>
          <option value="all">{t('task.marketplace_filters.all_skills', {}, 'All skills')}</option>
        </select>
      {/if}
    </div>

    <button
      class="flex h-10 items-center justify-center rounded-xl border border-border bg-background px-4 py-2 text-sm font-bold text-foreground transition-all hover:bg-muted/50 cursor-pointer"
      type="button"
      aria-expanded={isMobile ? mobileDrawerOpen : advancedOpen}
      aria-controls="marketplace-filter-drawer"
      onclick={() => {
        if (isMobile) {
          mobileDrawerOpen = true
        } else {
          advancedOpen = !advancedOpen
        }
      }}
    >
      {advancedOpen
        ? t('task.marketplace_filters.toggle_less', {}, 'Hide filters')
        : t('task.marketplace_filters.toggle_more', {}, 'More filters')}
    </button>

    <button
      class="flex h-10 items-center justify-center rounded-xl bg-primary px-5 py-2 text-sm font-bold text-primary-foreground transition-all hover:bg-primary/90 cursor-pointer"
      type="button"
      onclick={applyFilters}
    >
      {t('task.marketplace_filters.apply_filters', {}, 'Apply filters')}
    </button>
  </div>

  {#if advancedOpen && !isMobile}
    <MarketplaceAdvancedFilters
      bind:difficulty
      bind:taskType
      bind:verificationMethod
      bind:acceptingApplications
      bind:businessDomain
      bind:problemCategory
      bind:roleInTask
      bind:techStack
      bind:domainTags
      bind:sortBy
      bind:sortOrder
      {hasActiveFilters}
      {visibleSortOptions}
      onApply={applyFilters}
      onClear={clearFilters}
    />
  {/if}

  {#if isMobile}
    <FilterDrawer
      bind:open={mobileDrawerOpen}
      id="marketplace-filter-drawer"
      title={t('task.marketplace_filters.title', {}, 'Marketplace filters')}
      dirty={hasDraftChanges}
      onCancel={syncDraftFromFilters}
      onApply={applyFilters}
    >
      <MarketplaceAdvancedFilters
        bind:difficulty
        bind:taskType
        bind:verificationMethod
        bind:acceptingApplications
        bind:businessDomain
        bind:problemCategory
        bind:roleInTask
        bind:techStack
        bind:domainTags
        bind:sortBy
        bind:sortOrder
        {hasActiveFilters}
        {visibleSortOptions}
        onApply={applyFilters}
        onClear={clearFilters}
      />
    </FilterDrawer>
  {/if}

  {#if validationError}
    <p class="text-sm text-destructive font-medium w-full mt-2">{validationError}</p>
  {/if}
</div>
