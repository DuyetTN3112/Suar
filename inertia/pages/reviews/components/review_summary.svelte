<script lang="ts">
  /**
   * ReviewSummary — displays the submitted skill review ratings in a read-only table.
   */
  import Badge from '@/components/ui/badge.svelte'

  import type { SerializedSkillReview, ProficiencyLevelOption } from '../types.svelte'
  import { REVIEWER_TYPE_CONFIG } from '../types.svelte'

  interface Props {
    skillReviews: SerializedSkillReview[]
    proficiencyLevels: ProficiencyLevelOption[]
  }

  const { skillReviews, proficiencyLevels }: Props = $props()

  function getLevelInfo(code: string) {
    return proficiencyLevels.find((l) => l.value === code)
  }

  // Group by reviewer
  const groupedByReviewer = $derived.by(() => {
    const map = new Map<string, SerializedSkillReview[]>()
    for (const sr of skillReviews) {
      const key = sr.reviewer_id
      const bucket = map.get(key)
      if (bucket) {
        bucket.push(sr)
      } else {
        map.set(key, [sr])
      }
    }
    return Array.from(map.entries()).map(([reviewerId, reviews]) => ({
      reviewerId,
      reviewerName: reviews[0].reviewer?.username ?? 'Ẩn danh',
      reviewerType: reviews[0].reviewer_type,
      reviews,
    }))
  })
</script>

{#if skillReviews.length === 0}
  <div class="text-sm text-muted-foreground py-4 text-center">
    Chưa có đánh giá nào được gửi.
  </div>
{:else}
  <div class="space-y-6">
    {#each groupedByReviewer as group (group.reviewerId)}
      <div class="space-y-3">
        <div class="flex items-center gap-2">
          <span class="text-sm font-medium">{group.reviewerName}</span>
          <Badge variant="outline" class="text-[10px]">
            {REVIEWER_TYPE_CONFIG[group.reviewerType].labelVi}
          </Badge>
        </div>
        <div class="rounded-lg border overflow-hidden">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b bg-muted/50">
                <th class="text-left px-3 py-2 font-medium">Kỹ năng</th>
                <th class="text-left px-3 py-2 font-medium">Mức độ</th>
                <th class="text-left px-3 py-2 font-medium">Nhận xét</th>
              </tr>
            </thead>
            <tbody>
              {#each group.reviews as sr (sr.id)}
                {@const level = getLevelInfo(sr.assigned_level_code)}
                <tr class="border-b last:border-b-0">
                  <td class="px-3 py-2">{sr.skill?.skill_name ?? sr.skill_id}</td>
                  <td class="px-3 py-2">
                    {#if level}
                      <div class="flex items-center gap-1.5">
                        <span
                          class="inline-block w-2 h-2 rounded-full shrink-0"
                          style="background-color: {level.colorHex}"
                        ></span>
                        <span>{level.labelVi}</span>
                      </div>
                    {:else}
                      <span class="text-muted-foreground capitalize">{sr.assigned_level_code}</span>
                    {/if}
                  </td>
                  <td class="px-3 py-2 text-muted-foreground">
                    {sr.comment ?? '—'}
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>
    {/each}
  </div>
{/if}
