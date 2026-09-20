<script lang="ts">
  import { X } from 'lucide-svelte'

  import Button from '@/apps/user/shared/ui/button.svelte'
  import {
    TASK_SKILL_CATEGORY_ORDER,
    type TaskSkillCategoryCode,
  } from '@/apps/user/modules/tasks/lib/rules/task_skill_category_rules'
  import { useTranslation } from '@/apps/user/shared/stores/translation.svelte'
  import type { Skill } from '@/apps/shared/tasks/task_skills_types'

  interface Props {
    groupedSkills: Record<TaskSkillCategoryCode, Skill[]>
    getCategoryLabel: (category: TaskSkillCategoryCode) => string
    getLevelLabel: (levelValue: string) => string
    onRemoveSkill: (skillId: string) => void
  }

  const {
    groupedSkills,
    getCategoryLabel,
    getLevelLabel,
    onRemoveSkill,
  }: Props = $props()

  const { t } = useTranslation()

  const requirementSourceLabels: Record<string, string> = {
    professional_role: 'Từ Role',
    project_standard: 'Project Chuẩn',
    task_custom: 'Tùy chỉnh',
  }

  const importanceTone: Record<string, string> = {
    critical: 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300',
    high: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
    medium: 'border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300',
    low: 'border-border bg-secondary text-muted-foreground',
  }

  function getRequirementSourceLabel(source?: string): string | null {
    if (!source) return null
    return (
      requirementSourceLabels[source] ??
      t(`task.skill_requirements.source.${source}`, {}, source)
    )
  }
</script>

<div class="space-y-4">
  {#each TASK_SKILL_CATEGORY_ORDER as category (category)}
    <section class="space-y-2">
      <div class="flex items-center justify-between gap-3">
        <div class="text-sm font-medium text-foreground">
          {getCategoryLabel(category)}
        </div>
        <span class="text-xs text-muted-foreground">
          {t('task.skill_requirements.selected_skill_count', { count: groupedSkills[category].length }, ':count selected skills')}
        </span>
      </div>

      {#if groupedSkills[category].length === 0}
        <div class="rounded-xl border border-dashed bg-muted/10 px-3 py-4 text-sm text-muted-foreground">
          {t('task.skill_requirements.group_empty', {}, 'No skills in this group yet.')}
        </div>
      {:else}
        <div class="space-y-2">
          {#each groupedSkills[category] as skill (skill.id)}
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
