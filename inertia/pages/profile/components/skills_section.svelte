<script lang="ts">
  /**
   * SkillsSection — grouped display of user skills by category.
   */
  import SkillCard from './skill_card.svelte'
  import type { UserSkillResult, ProficiencyLevelOption } from '../types.svelte'

  interface Props {
    skills: UserSkillResult[]
    proficiencyLevels?: ProficiencyLevelOption[]
    editable?: boolean
    onEdit?: (skill: UserSkillResult) => void
    onRemove?: (skill: UserSkillResult) => void
  }

  const { skills, proficiencyLevels = [], editable = false, onEdit, onRemove }: Props = $props()

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
    return Array.from(map.entries()).map(([category, items]) => ({
      category,
      categoryLabel: getCategoryLabel(category),
      items,
    }))
  })

  function getCategoryLabel(code: string): string {
    switch (code) {
      case 'technical': return 'Kỹ năng kỹ thuật'
      case 'soft_skill': return 'Kỹ năng mềm'
      case 'delivery': return 'Kỹ năng thực thi'
      default: return code
    }
  }
</script>

{#if skills.length === 0}
  <div class="text-sm text-muted-foreground text-center py-8">
    Chưa có kỹ năng nào được thêm.
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
