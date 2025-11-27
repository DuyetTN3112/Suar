<script lang="ts">
  /**
   * SkillsSection — grouped display of user skills by category.
   */
  import { getProfileCategoryLabel } from '@/apps/org/modules/profile/profile_theme'
  import { useTranslation } from '@/apps/org/shared/stores/translation.svelte'

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

  const categoryOrder = ['technology', 'engineering', 'soft_skill', 'delivery']

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
    return Array.from(map.entries())
      .sort(([left], [right]) => {
        const leftIndex = categoryOrder.indexOf(left)
        const rightIndex = categoryOrder.indexOf(right)
        return (leftIndex === -1 ? 99 : leftIndex) - (rightIndex === -1 ? 99 : rightIndex)
      })
      .map(([category, items]) => ({
        category,
        categoryLabel: categoryLabel(category),
        items,
      }))
  })
</script>

{#if skills.length === 0}
  <div class="text-sm text-muted-foreground text-center py-8">
    {t('user.profile_skills.group_empty', {}, 'No skills in this group yet.')}
  </div>
{:else}
  <div class="space-y-6">
    {#each groupedSkills as group (group.category)}
      <div>
        <h3 class="text-sm font-medium mb-3">{group.categoryLabel}</h3>
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
      </div>
    {/each}
  </div>
{/if}
