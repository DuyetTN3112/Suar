<script lang="ts">
  import { Search } from 'lucide-svelte'

  import Button from '@/apps/user/shared/ui/button.svelte'
  import Input from '@/apps/user/shared/ui/input.svelte'
  import type { TaskSkillCategoryCode } from '@/apps/user/modules/tasks/lib/rules/task_skill_category_rules'
  import { useTranslation } from '@/apps/user/shared/stores/translation.svelte'
  import type { AvailableSkill } from '@/apps/shared/tasks/task_skills_types'

  interface Props {
    category: TaskSkillCategoryCode
    categoryLabel: string
    categoryMinimum: number
    categoryCount: number
    skillSearchValue: string
    onSearchInput: (value: string) => void
    selectedSkillId: string
    onSelectSkillId: (skillId: string) => void
    filteredSkills: AvailableSkill[]
    selectedLevel: string
    onSelectLevel: (level: string) => void
    allowedLevels: { id?: string; value: string; label: string }[]
    getLevelLabel: (value: string) => string
    addableSkill?: AvailableSkill
    requireRubric?: boolean
    canAdd: boolean
    onAddSkill: () => void
  }

  const {
    category,
    categoryLabel,
    categoryMinimum,
    categoryCount,
    skillSearchValue,
    onSearchInput,
    selectedSkillId,
    onSelectSkillId,
    filteredSkills,
    selectedLevel,
    onSelectLevel,
    allowedLevels,
    getLevelLabel,
    addableSkill,
    requireRubric = false,
    canAdd,
    onAddSkill,
  }: Props = $props()

  const { t } = useTranslation()
</script>

<section class="rounded-xl border bg-background/80 p-4">
  <div class="mb-3">
    <div class="flex items-center justify-between gap-3">
      <div class="text-sm font-semibold text-foreground">
        {categoryLabel}
      </div>
      <span class="rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
        {#if categoryMinimum === 0}
          Optional
        {:else}
          {categoryCount}/{categoryMinimum}+
        {/if}
      </span>
    </div>
  </div>

  <div class="space-y-3">
    <div class="space-y-2">
      <div class="min-w-0 space-y-2">
        <label class="sr-only" for={`skill-search-${category}`}>
          {t('task.skill_requirements.search_category_label', { category: categoryLabel }, 'Search :category skills')}
        </label>
        <div class="relative">
          <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id={`skill-search-${category}`}
            value={skillSearchValue}
            class="pl-9"
            placeholder={t('task.skill_requirements.search_placeholder', {}, 'Search or enter a skill...')}
            oninput={(event: Event) => {
              onSearchInput((event.target as HTMLInputElement).value)
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
          {t('task.skill_requirements.skill_category_label', { category: categoryLabel }, ':category skill')}
        </label>
        <select
          id={`skill-select-${category}`}
          value={selectedSkillId}
          class="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-medium text-foreground shadow-suar-hairline focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:opacity-50"
          onchange={(event: Event) => {
            onSelectSkillId((event.target as HTMLSelectElement).value)
          }}
        >
          <option value="">{t('task.skill_requirements.choose_skill', {}, 'Choose skill...')}</option>
          {#each filteredSkills as skill (skill.id)}
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
          {t('task.skill_requirements.level_category_label', { category: categoryLabel }, ':category level')}
        </label>
        <select
          id={`level-select-${category}`}
          value={selectedLevel}
          class="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-medium text-foreground shadow-suar-hairline focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:opacity-50"
          onchange={(event: Event) => {
            onSelectLevel((event.target as HTMLSelectElement).value)
          }}
        >
          {#each allowedLevels as level (level.value)}
            <option value={level.value}>{getLevelLabel(level.value)}</option>
          {/each}
        </select>
      </div>
    </div>

    {#if addableSkill && allowedLevels.length === 0}
      <p class="text-xs text-amber-700 dark:text-amber-300">
        Kỹ năng này chưa có khoảng level tại Project nên chưa thể dùng cho task.
      </p>
    {/if}
    {#if requireRubric && addableSkill && !(addableSkill?.rubricVersionId ?? addableSkill?.rubric_version_id)}
      <p class="text-xs text-amber-700 dark:text-amber-300">
        Skill này chưa có rubric publish. Bạn vẫn có thể chọn để xem cấu hình, nhưng chưa thể đăng Task.
      </p>
    {/if}

    <Button
      type="button"
      size="sm"
      variant="outline"
      class="w-full"
      aria-label={t('task.skill_requirements.add_category_label', { category: categoryLabel }, 'Add :category')}
      disabled={!canAdd}
      onclick={onAddSkill}
    >
      {t('task.skill_requirements.add_button', {}, 'Add')}
    </Button>
  </div>
</section>
