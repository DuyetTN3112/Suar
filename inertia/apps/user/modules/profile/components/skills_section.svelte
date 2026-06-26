<script lang="ts">
  /**
   * SkillsSection — grouped display of user skills by category.
   */
  import { PROFILE_CATEGORY_ORDER, getProfileCategoryLabel } from '@/apps/user/modules/profile/profile_theme'
  import { useTranslation } from '@/apps/user/shared/stores/translation.svelte'

  import type { UserSkillResult, ProficiencyLevelOption } from '../types.svelte'

  import SkillCard from './skill_card.svelte'

  interface Props {
    skills: UserSkillResult[]
    proficiencyLevels?: ProficiencyLevelOption[]
    editable?: boolean
    onEdit?: (skill: UserSkillResult) => void
    onRemove?: (skill: UserSkillResult) => void
  }

  const { skills, proficiencyLevels = [], editable = false, onEdit, onRemove }: Props = $props()
  const { t } = useTranslation()

  function categoryLabel(categoryCode: string): string {
    return t(
      `user.profile_categories.${categoryCode}`,
      {},
      getProfileCategoryLabel(categoryCode)
    )
  }

  // Group skills by category
  const groupedSkills = $derived.by(() => {
    const map = new Map<string, UserSkillResult[]>()
    for (const skill of skills) {
      const key = skill.category_code
      const bucket = map.get(key)
      if (bucket) {
        bucket.push(skill)
      } else {
        map.set(key, [skill])
      }
    }
    const canonicalGroups = PROFILE_CATEGORY_ORDER.map((category) => ({
      category,
      categoryLabel: getProfileCategoryLabel(category),
      items: map.get(category) ?? [],
    }))
    const extraGroups = Array.from(map.entries())
      .filter(([category]) => !PROFILE_CATEGORY_ORDER.includes(category as never))
      .sort(([left], [right]) => {
        return left.localeCompare(right)
      })
      .map(([category, items]) => ({
        category,
        categoryLabel: categoryLabel(category),
        items,
      }))

    return [...canonicalGroups.map((group) => ({
      ...group,
      categoryLabel: categoryLabel(group.category),
    })), ...extraGroups]
  })
</script>

<div class="space-y-6">
  {#each groupedSkills as group (group.category)}
    <div>
      <div class="mb-3 flex items-center justify-between gap-3">
        <h3 class="text-sm font-medium">{group.categoryLabel}</h3>
        <span class="text-xs font-semibold text-muted-foreground">{t('user.profile_skills.skill_count', { count: group.items.length }, ':count skills')}</span>
      </div>
      {#if group.items.length === 0}
        <div class="rounded-lg border border-dashed border-border bg-background/60 px-4 py-5 text-center text-sm text-muted-foreground">
          {t('user.profile_skills.group_empty', {}, 'No skills in this group yet.')}
        </div>
      {:else}
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {#each group.items as skill (skill.id)}
            <SkillCard
              {skill}
              {proficiencyLevels}
              {editable}
              {onEdit}
              {onRemove}
            />
          {/each}
        </div>
      {/if}
    </div>
  {/each}
</div>
