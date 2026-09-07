<script lang="ts">
  /**
   * MarketplaceFilters — filter bar for marketplace task listing.
   * Emits changes via Inertia router.get to reload with server-side filtering.
  */
  import { router } from '@inertiajs/svelte'
  import { X } from 'lucide-svelte'
  import { onMount } from 'svelte'


  import FilterDrawer from '@/apps/shared/filtering/components/filter_drawer.svelte'
  import { useTranslation } from '@/apps/user/shared/stores/translation.svelte'
  import { TASK_VERIFICATION_METHOD_OPTIONS } from '@/apps/user/modules/tasks/lib/rules/task_verification_methods'
  import {
    BUSINESS_DOMAIN_OPTIONS,
    DIFFICULTY_CONFIG,
    PROBLEM_CATEGORY_OPTIONS,
    ROLE_IN_TASK_OPTIONS,
    SORT_OPTIONS,
    TASK_TYPE_OPTIONS,
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

  const difficulties = Object.keys(DIFFICULTY_CONFIG) as Array<keyof typeof DIFFICULTY_CONFIG>
  const visibleSortOptions = $derived(
    allowRecommendedSort ? SORT_OPTIONS : SORT_OPTIONS.filter((option) => option.value !== 'recommended')
  )

  function difficultyLabel(value: keyof typeof DIFFICULTY_CONFIG): string {
    return t(`task.marketplace_filters.difficulty.${value}`, {}, DIFFICULTY_CONFIG[value].label)
  }

  function sortLabel(value: string, fallback: string): string {
    return t(`task.marketplace_filters.sort_by.${value}`, {}, fallback)
  }

  type TaskTaxonomyGroup = 'task_type' | 'business_domain' | 'problem_category' | 'role_in_task'

  function taxonomyLabel(
    group: TaskTaxonomyGroup,
    option: { value: string; label: string }
  ): string {
    return t(`task.taxonomy.${group}.${option.value}`, {}, option.label)
  }

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
    {@render advancedFilters()}
  {/if}

  {#snippet advancedFilters()}
    <div class="mt-3 grid items-end gap-3 border-t border-border pt-3 sm:grid-cols-2 lg:grid-cols-4">
  <div class="space-y-1.5 flex flex-col min-w-0 sm:min-w-[140px]">
    <label for="difficulty-filter" class="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
      {t('task.marketplace_filters.difficulty_label', {}, 'Difficulty')}
    </label>
    <select
      id="difficulty-filter"
      class="flex h-10 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm transition-all focus:border-foreground focus:outline-hidden cursor-pointer"
      bind:value={difficulty}
    >
      <option value="">{t('task.marketplace_filters.all', {}, 'All')}</option>
      {#each difficulties as value}
        <option {value}>{difficultyLabel(value)}</option>
      {/each}
    </select>
  </div>

  <div class="space-y-1.5 flex flex-col min-w-0 sm:min-w-[180px]">
    <label for="task-type-filter" class="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
      {t('task.marketplace_filters.task_type', {}, 'Task type')}
    </label>
    <select
      id="task-type-filter"
      class="flex h-10 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm transition-all focus:border-foreground focus:outline-hidden cursor-pointer"
      bind:value={taskType}
    >
      <option value="">{t('task.marketplace_filters.all', {}, 'All')}</option>
      {#each TASK_TYPE_OPTIONS as option (option.value)}
        <option value={option.value}>{taxonomyLabel('task_type', option)}</option>
      {/each}
    </select>
  </div>

  <div class="space-y-1.5 flex flex-col min-w-0 sm:min-w-[190px]">
    <label for="verification-method-filter" class="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
      {t('task.marketplace_filters.verification_method', {}, 'Verification')}
    </label>
    <select
      id="verification-method-filter"
      class="flex h-10 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm transition-all focus:border-foreground focus:outline-hidden cursor-pointer"
      bind:value={verificationMethod}
    >
      <option value="">{t('task.marketplace_filters.all', {}, 'All')}</option>
      {#each TASK_VERIFICATION_METHOD_OPTIONS as option (option.value)}
        <option value={option.value}>{t(`task.verification_methods.${option.value}`, {}, option.label)}</option>
      {/each}
    </select>
  </div>

  <div class="space-y-1.5 flex flex-col min-w-0 sm:min-w-[170px]">
    <label for="accepting-applications-filter" class="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
      {t('task.marketplace_filters.accepting_applications_label', {}, 'Applications')}
    </label>
    <select
      id="accepting-applications-filter"
      class="flex h-10 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm transition-all focus:border-foreground focus:outline-hidden cursor-pointer"
      bind:value={acceptingApplications}
    >
      <option value="">{t('task.marketplace_filters.all', {}, 'All')}</option>
      <option value="open">{t('task.marketplace_filters.accepting_applications.open', {}, 'Open')}</option>
      <option value="closed">{t('task.marketplace_filters.accepting_applications.closed', {}, 'Closed')}</option>
    </select>
  </div>

  <div class="space-y-1.5 flex flex-col min-w-0 sm:min-w-[170px]">
    <label for="business-domain-filter" class="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
      {t('task.marketplace_filters.business_domain', {}, 'Business domain')}
    </label>
    <select
      id="business-domain-filter"
      class="flex h-10 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm transition-all focus:border-foreground focus:outline-hidden cursor-pointer"
      bind:value={businessDomain}
    >
      <option value="">{t('task.marketplace_filters.all', {}, 'All')}</option>
      {#each BUSINESS_DOMAIN_OPTIONS as option (option.value)}
        <option value={option.value}>{taxonomyLabel('business_domain', option)}</option>
      {/each}
    </select>
  </div>

  <div class="space-y-1.5 flex flex-col min-w-0 sm:min-w-[170px]">
    <label for="problem-category-filter" class="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
      {t('task.marketplace_filters.problem_category', {}, 'Problem type')}
    </label>
    <select
      id="problem-category-filter"
      class="flex h-10 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm transition-all focus:border-foreground focus:outline-hidden cursor-pointer"
      bind:value={problemCategory}
    >
      <option value="">{t('task.marketplace_filters.all', {}, 'All')}</option>
      {#each PROBLEM_CATEGORY_OPTIONS as option (option.value)}
        <option value={option.value}>{taxonomyLabel('problem_category', option)}</option>
      {/each}
    </select>
  </div>

  <div class="space-y-1.5 flex flex-col min-w-0 sm:min-w-[160px]">
    <label for="role-in-task-filter" class="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
      {t('task.marketplace_filters.role_in_task', {}, 'Role')}
    </label>
    <select
      id="role-in-task-filter"
      class="flex h-10 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm transition-all focus:border-foreground focus:outline-hidden cursor-pointer"
      bind:value={roleInTask}
    >
      <option value="">{t('task.marketplace_filters.all', {}, 'All')}</option>
      {#each ROLE_IN_TASK_OPTIONS as option (option.value)}
        <option value={option.value}>{taxonomyLabel('role_in_task', option)}</option>
      {/each}
    </select>
  </div>

  <div class="space-y-1.5 flex flex-col min-w-0 sm:min-w-[170px]">
    <label for="tech-stack-filter" class="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
      {t('ui_misc.marketplace_filters.tech_stack_label', {}, 'Tech stack')}
    </label>
    <input
      id="tech-stack-filter"
      class="flex h-10 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm transition-all focus:border-foreground focus:outline-hidden"
      type="search"
      placeholder={t(
        'ui_misc.marketplace_filters.tech_stack_placeholder',
        {},
        'React, AdonisJS...'
      )}
      bind:value={techStack}
      onkeydown={(event: KeyboardEvent) => {
        if (event.key === 'Enter') {
          event.preventDefault()
          applyFilters()
        }
      }}
    />
  </div>

  <div class="space-y-1.5 flex flex-col min-w-0 sm:min-w-[170px]">
    <label for="domain-tags-filter" class="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
      {t('ui_misc.marketplace_filters.domain_tags_label', {}, 'Domain tags')}
    </label>
    <input
      id="domain-tags-filter"
      class="flex h-10 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm transition-all focus:border-foreground focus:outline-hidden"
      type="search"
      placeholder={t(
        'ui_misc.marketplace_filters.domain_tags_placeholder',
        {},
        'auth, billing...'
      )}
      bind:value={domainTags}
      onkeydown={(event: KeyboardEvent) => {
        if (event.key === 'Enter') {
          event.preventDefault()
          applyFilters()
        }
      }}
    />
  </div>

  <div class="space-y-1.5 flex flex-col min-w-0 sm:min-w-[140px]">
    <label for="sort-filter" class="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
      {t('task.marketplace_filters.sort_label', {}, 'Sort')}
    </label>
    <select
      id="sort-filter"
      class="flex h-10 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm transition-all focus:border-foreground focus:outline-hidden cursor-pointer"
      bind:value={sortBy}
    >
      {#each visibleSortOptions as opt}
        <option value={opt.value}>{sortLabel(opt.value, opt.label)}</option>
      {/each}
    </select>
  </div>

  <button
    class="flex h-10 items-center justify-center rounded-xl border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground transition-all hover:bg-muted/50 cursor-pointer"
    type="button"
    onclick={() => { sortOrder = sortOrder === 'desc' ? 'asc' : 'desc' }}
  >
    {sortOrder === 'desc'
      ? t('task.marketplace_filters.sort.desc', {}, '↓ Descending')
      : t('task.marketplace_filters.sort.asc', {}, '↑ Ascending')}
  </button>

  <button
    class="flex h-10 items-center gap-1.5 rounded-xl bg-primary px-5 py-2 text-sm font-bold text-primary-foreground transition-all hover:bg-primary/90 cursor-pointer"
    type="button"
    onclick={applyFilters}
  >
    {t('task.marketplace_filters.apply_filters', {}, 'Apply filters')}
  </button>

  {#if hasActiveFilters}
    <button
      class="flex h-10 items-center gap-1.5 rounded-xl border border-border bg-background text-muted-foreground px-4 py-2 text-sm font-bold transition-all hover:bg-muted/50 hover:text-foreground cursor-pointer"
      type="button"
      onclick={clearFilters}
    >
      <X class="h-4 w-4" />
      {t('task.marketplace_filters.clear_filters', {}, 'Clear filters')}
    </button>
  {/if}
    </div>
  {/snippet}

  {#if isMobile}
    <FilterDrawer
      bind:open={mobileDrawerOpen}
      id="marketplace-filter-drawer"
      title={t('task.marketplace_filters.title', {}, 'Marketplace filters')}
      dirty={hasDraftChanges}
      onCancel={syncDraftFromFilters}
      onApply={applyFilters}
    >
      {@render advancedFilters()}
    </FilterDrawer>
  {/if}

  {#if validationError}
    <p class="text-sm text-destructive font-medium w-full mt-2">{validationError}</p>
  {/if}
</div>
