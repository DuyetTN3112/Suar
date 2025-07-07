<script lang="ts">
  /**
   * SkillCard — displays a single user skill with level, score, and review count.
   */
  import Badge from '@/components/ui/badge.svelte'

  import type { UserSkillResult, ProficiencyLevelOption } from '../types.svelte'

  interface Props {
    skill: UserSkillResult
    proficiencyLevels?: ProficiencyLevelOption[]
    onEdit?: (skill: UserSkillResult) => void
    onRemove?: (skill: UserSkillResult) => void
    editable?: boolean
  }

  const { skill, proficiencyLevels = [], onEdit, onRemove, editable = false }: Props = $props()

  const levelInfo = $derived(
    proficiencyLevels.find((l) => l.value === skill.level_code)
  )

  const lastReviewed = $derived(
    skill.last_reviewed_at
      ? new Date(skill.last_reviewed_at).toLocaleDateString('vi-VN')
      : null
  )

  const scoreText = $derived(() => {
    const raw = skill.avg_percentage
    if (typeof raw !== 'number' || !Number.isFinite(raw)) {
      return null
    }
    return `${raw.toFixed(1)}%`
  })
</script>

<div class="rounded-lg border p-3 space-y-2 hover:shadow-sm transition-shadow">
  <div class="flex items-start justify-between gap-2">
    <div class="min-w-0">
      <h4 class="text-sm font-medium truncate">{skill.skill_name}</h4>
      <span class="text-[10px] text-muted-foreground capitalize">
        {skill.category_code.replace('_', ' ')}
      </span>
    </div>
    {#if levelInfo}
      <Badge variant="outline" class="shrink-0 text-[10px]" style="border-color: {levelInfo.colorHex}; color: {levelInfo.colorHex}">
        {levelInfo.labelVi}
      </Badge>
    {:else}
      <Badge variant="outline" class="shrink-0 text-[10px] capitalize">
        {skill.level_code}
      </Badge>
    {/if}
  </div>

  <div class="flex items-center gap-3 text-xs text-muted-foreground">
    {#if scoreText()}
      <span>Điểm: {scoreText()}</span>
    {:else}
      <span>Điểm: Chưa có</span>
    {/if}
    <span>{skill.total_reviews} đánh giá</span>
    {#if lastReviewed}
      <span>Lần cuối: {lastReviewed}</span>
    {/if}
  </div>

  {#if editable}
    <div class="flex items-center gap-2 pt-1">
      <button
        type="button"
        class="text-xs text-primary hover:underline"
        onclick={() => onEdit?.(skill)}
      >
        Chỉnh sửa
      </button>
      <button
        type="button"
        class="text-xs text-destructive hover:underline"
        onclick={() => onRemove?.(skill)}
      >
        Xóa
      </button>
    </div>
  {/if}
</div>
