<script lang="ts">
  import { useTranslation } from '@/apps/org/shared/stores/translation.svelte'
  import type { SkillOption, TaskOption } from '../types'

  interface FilterFormValues {
    q: string
    taskId: string
    selectedCategories: string[]
    selectedSkillIds: string[]
    businessDomain: string
    taskType: string
    problemCategory: string
    roleInTask: string
    techStack: string
    domainTags: string
    sortBy: string
    sortOrder: string
    availableBefore: string
    minProficiency: string
  }

  interface Props {
    formValues: FilterFormValues
    availableTasks: TaskOption[]
    availableSkills: SkillOption[]
    onSubmit: () => void
  }

  let { formValues = $bindable(), availableTasks, availableSkills, onSubmit }: Props = $props()

  const { t } = useTranslation()

  const proficiencyLevels = Array.from({ length: 15 }, (_, index) => `l${index}`)

  const taxonomy = {
    businessDomains: ['Fintech', 'Gaming', 'Healthcare', 'Education'],
    taskTypes: ['API design', 'System integration', 'QA testing', 'Feature development'],
    problemCategories: ['Compliance', 'Reliability', 'Performance', 'Security'],
  }

  const categoryLabels: Record<string, string> = {
    technology: 'Technology',
    engineering: 'Engineering',
    delivery: 'Delivery',
    soft_skill: 'Soft Skills',
  }

  const filteredSkills = $derived(
    formValues.selectedCategories.length === 0
      ? availableSkills
      : availableSkills.filter((skill) => formValues.selectedCategories.includes(skill.category_code))
  )

  function toggleCategory(category: string) {
    formValues.selectedCategories = formValues.selectedCategories.includes(category)
      ? formValues.selectedCategories.filter((item) => item !== category)
      : [...formValues.selectedCategories, category]
    formValues.selectedSkillIds = []
  }

  function toggleSkill(skillId: string) {
    formValues.selectedSkillIds = formValues.selectedSkillIds.includes(skillId)
      ? formValues.selectedSkillIds.filter((item) => item !== skillId)
      : [...formValues.selectedSkillIds, skillId]
  }
</script>

<form
  class="grid items-end gap-3 rounded-xl border border-border bg-background p-4 md:grid-cols-3 xl:grid-cols-4"
  onsubmit={(event) => {
    event.preventDefault()
    onSubmit()
  }}
>
  <input
    data-testid="talent-search-keyword"
    class="h-10 rounded-xl border border-border px-3 py-2 text-sm"
    bind:value={formValues.q}
    placeholder={t('workspace.talents.search_placeholder', {}, 'Search talent')}
  />
  <select
    data-testid="talent-search-task"
    class="h-10 rounded-xl border border-border px-3 py-2 text-sm"
    bind:value={formValues.taskId}
  >
    <option value="">{t('workspace.talents.choose_task', {}, 'Choose task')}</option>
    {#each availableTasks as task (task.id)}
      <option value={task.id}>{task.title}</option>
    {/each}
  </select>
  <select
    data-testid="talent-sort-by"
    class="h-10 rounded-xl border border-border px-3 py-2 text-sm"
    bind:value={formValues.sortBy}
  >
    <option value="relevance">
      {t('workspace.talents.sort.relevance', {}, 'Relevance')}
    </option>
    <option value="trust_score">
      {t('workspace.talents.sort.trust_score', {}, 'Trust score')}
    </option>
    <option value="completed_tasks">
      {t('workspace.talents.sort.completed_tasks', {}, 'Completed tasks')}
    </option>
  </select>
  <select
    data-testid="talent-sort-order"
    class="h-10 rounded-xl border border-border px-3 py-2 text-sm"
    bind:value={formValues.sortOrder}
  >
    <option value="desc">
      {t('workspace.talents.sort.desc', {}, 'Descending')}
    </option>
    <option value="asc">
      {t('workspace.talents.sort.asc', {}, 'Ascending')}
    </option>
  </select>
  <input
    data-testid="talent-available-before"
    type="date"
    class="h-10 rounded-xl border border-border px-3 py-2 text-sm"
    bind:value={formValues.availableBefore}
    aria-label={t('workspace.talents.available_before', {}, 'Available before')}
  />
  <select
    data-testid="talent-min-proficiency"
    class="h-10 rounded-xl border border-border px-3 py-2 text-sm"
    bind:value={formValues.minProficiency}
  >
    <option value="">
      {t('workspace.talents.min_proficiency', {}, 'Minimum proficiency')}
    </option>
    {#each proficiencyLevels as level}
      <option value={level}>{level.toUpperCase()}</option>
    {/each}
  </select>
  <details
    data-testid="talent-skill-filter"
    class="rounded-xl border border-border px-3 py-2 text-sm"
    open={formValues.selectedSkillIds.length > 0}
  >
    <summary class="flex cursor-pointer list-none items-center justify-between gap-2 text-xs font-semibold text-muted-foreground">
      <span>{t('workspace.talents.skill_filter', {}, 'Skills')}</span>
      {#if formValues.selectedSkillIds.length > 0}
        <span class="rounded-full bg-muted px-2 py-0.5 text-foreground">
          {formValues.selectedSkillIds.length}
        </span>
      {/if}
    </summary>
    <div class="mt-2 max-h-36 space-y-1 overflow-y-auto pr-1" style="max-height: 9rem; overflow-y: auto;">
      {#if filteredSkills.length === 0}
        <p class="text-xs text-muted-foreground">
          {t('workspace.talents.no_skills', {}, 'No skills in this category')}
        </p>
      {:else}
        {#each filteredSkills as skill (skill.id)}
          <label class="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 hover:bg-muted">
            <input
              type="checkbox"
              value={skill.id}
              checked={formValues.selectedSkillIds.includes(skill.id)}
              onchange={() => toggleSkill(skill.id)}
            />
            <span>{skill.skill_name} · {categoryLabels[skill.category_code] ?? skill.category_code}</span>
          </label>
        {/each}
      {/if}
    </div>
  </details>
  <select
    data-testid="talent-business-domain"
    class="h-10 rounded-xl border border-border px-3 py-2 text-sm"
    bind:value={formValues.businessDomain}
  >
    <option value="">
      {t('workspace.talents.business_domain', {}, 'Business domain')}
    </option>
    {#each taxonomy.businessDomains as option}
      <option value={option.toLowerCase().replaceAll(' ', '_')}>{option}</option>
    {/each}
  </select>
  <select
    data-testid="talent-task-type"
    class="h-10 rounded-xl border border-border px-3 py-2 text-sm"
    bind:value={formValues.taskType}
  >
    <option value="">{t('workspace.talents.task_type', {}, 'Task type')}</option>
    {#each taxonomy.taskTypes as option}
      <option value={option.toLowerCase().replaceAll(' ', '_')}>{option}</option>
    {/each}
  </select>
  <select
    data-testid="talent-problem-category"
    class="h-10 rounded-xl border border-border px-3 py-2 text-sm"
    bind:value={formValues.problemCategory}
  >
    <option value="">
      {t('workspace.talents.problem_category', {}, 'Problem category')}
    </option>
    {#each taxonomy.problemCategories as option}
      <option value={option.toLowerCase().replaceAll(' ', '_')}>{option}</option>
    {/each}
  </select>
  <input
    data-testid="talent-role-in-task"
    class="h-10 rounded-xl border border-border px-3 py-2 text-sm"
    bind:value={formValues.roleInTask}
    onchange={(event) => {
      formValues.roleInTask = (event.currentTarget as HTMLInputElement).value
    }}
    placeholder={t('workspace.talents.role_in_task', {}, 'Role in task')}
  />
  <input
    data-testid="talent-tech-stack"
    class="h-10 rounded-xl border border-border px-3 py-2 text-sm"
    bind:value={formValues.techStack}
    placeholder={t('workspace.talents.tech_stack', {}, 'Tech stack')}
  />
  <input
    data-testid="talent-domain-tags"
    class="h-10 rounded-xl border border-border px-3 py-2 text-sm"
    bind:value={formValues.domainTags}
    placeholder={t('workspace.talents.domain_tags', {}, 'Domain tags')}
  />
  <div class="flex h-10 items-center gap-2 text-xs">
    {#each Object.entries(categoryLabels) as [category, label]}
      <label class="inline-flex items-center gap-1.5 whitespace-nowrap">
        <input
          type="checkbox"
          checked={formValues.selectedCategories.includes(category)}
          onchange={() => toggleCategory(category)}
        />
        {t(`common.skill_search.categories.${category}`, {}, label)}
      </label>
    {/each}
  </div>
  <button class="h-10 rounded-xl border border-border px-4 py-2 text-sm font-bold" type="submit">
    {t('workspace.talents.search', {}, 'Search')}
  </button>
</form>
