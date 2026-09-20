<script lang="ts">
  import { X } from 'lucide-svelte'
  import { useTranslation } from '@/apps/user/shared/stores/translation.svelte'
  import { TASK_VERIFICATION_METHOD_OPTIONS } from '@/apps/user/modules/tasks/lib/rules/task_verification_methods'
  import {
    BUSINESS_DOMAIN_OPTIONS,
    DIFFICULTY_CONFIG,
    PROBLEM_CATEGORY_OPTIONS,
    ROLE_IN_TASK_OPTIONS,
    TASK_TYPE_OPTIONS,
  } from '../types.svelte'

  interface Props {
    difficulty: string
    taskType: string
    verificationMethod: string
    acceptingApplications: string
    businessDomain: string
    problemCategory: string
    roleInTask: string
    techStack: string
    domainTags: string
    sortBy: string
    sortOrder: string
    hasActiveFilters: boolean
    visibleSortOptions: Array<{ value: string; label: string }>
    onApply: () => void
    onClear: () => void
  }

  let {
    difficulty = $bindable(),
    taskType = $bindable(),
    verificationMethod = $bindable(),
    acceptingApplications = $bindable(),
    businessDomain = $bindable(),
    problemCategory = $bindable(),
    roleInTask = $bindable(),
    techStack = $bindable(),
    domainTags = $bindable(),
    sortBy = $bindable(),
    sortOrder = $bindable(),
    hasActiveFilters,
    visibleSortOptions,
    onApply,
    onClear,
  }: Props = $props()

  const { t } = useTranslation()

  const difficulties = Object.keys(DIFFICULTY_CONFIG) as Array<keyof typeof DIFFICULTY_CONFIG>

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
</script>

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
          onApply()
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
          onApply()
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
    onclick={() => {
      sortOrder = sortOrder === 'desc' ? 'asc' : 'desc'
    }}
  >
    {sortOrder === 'desc'
      ? t('task.marketplace_filters.sort.desc', {}, '↓ Descending')
      : t('task.marketplace_filters.sort.asc', {}, '↑ Ascending')}
  </button>

  <button
    class="flex h-10 items-center gap-1.5 rounded-xl bg-primary px-5 py-2 text-sm font-bold text-primary-foreground transition-all hover:bg-primary/90 cursor-pointer"
    type="button"
    onclick={onApply}
  >
    {t('task.marketplace_filters.apply_filters', {}, 'Apply filters')}
  </button>

  {#if hasActiveFilters}
    <button
      class="flex h-10 items-center gap-1.5 rounded-xl border border-border bg-background text-muted-foreground px-4 py-2 text-sm font-bold transition-all hover:bg-muted/50 hover:text-foreground cursor-pointer"
      type="button"
      onclick={onClear}
    >
      <X class="h-4 w-4" />
      {t('task.marketplace_filters.clear_filters', {}, 'Clear filters')}
    </button>
  {/if}
</div>
