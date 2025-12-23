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

  function formatEvidenceDate(value: string | null): string {
    return value ? new Date(value).toLocaleDateString('vi-VN') : 'Chưa rõ ngày'
  }
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

  {#if skill.evidence_history.length > 0}
    <div class="rounded-md border border-dashed bg-muted/20 p-2 text-[11px]">
      <div class="mb-1 flex items-center justify-between gap-2">
        <span class="font-semibold text-foreground">Evidence history</span>
        <span class="text-muted-foreground">{skill.evidence_count} nguồn</span>
      </div>
      <div class="space-y-1.5">
        {#each skill.evidence_history as item}
          <div>
            <div class="flex flex-wrap items-center gap-1 text-muted-foreground">
              <span class="font-medium text-foreground">{item.task_title}</span>
              <span>· {formatEvidenceDate(item.completed_at)}</span>
              {#if item.reviewer_type}
                <span>· {item.reviewer_type}</span>
              {/if}
              {#if item.assigned_level_code}
                <span>· {item.assigned_level_code}</span>
              {/if}
            </div>
            {#if item.comment}
              <p class="line-clamp-2 text-muted-foreground">{item.comment}</p>
            {/if}
            {#if item.evidence_links.length > 0}
              <div class="mt-0.5 flex flex-wrap gap-1">
                {#each item.evidence_links.slice(0, 2) as link}
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    class="rounded bg-ink-04 px-1.5 py-0.5 font-medium text-foreground hover:underline"
                  >
                    {link.title ?? link.evidence_type}
                  </a>
                {/each}
              </div>
            {/if}
          </div>
        {/each}
      </div>
    </div>
  {:else if skill.total_reviews > 0}
    <div class="rounded-md border border-dashed p-2 text-[11px] text-muted-foreground">
      Có aggregate review nhưng chưa có work-history evidence snapshot.
    </div>
  {/if}

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
