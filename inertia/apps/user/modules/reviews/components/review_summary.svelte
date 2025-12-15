<script lang="ts">
  /**
   * ReviewSummary — displays the submitted skill review ratings in a read-only table.
   */
  import Badge from '@/apps/user/shared/ui/badge.svelte'
  import { useTranslation } from '@/apps/user/shared/stores/translation.svelte'
  import { findFrontendCanonicalProficiencyLevelOption } from '@/apps/user/modules/profile/lib/proficiency_level_catalog'
  import type { FrontendCanonicalProficiencyLevelOption } from '@/apps/user/modules/profile/lib/proficiency_level_catalog'

  import type { SerializedSkillReview, ProficiencyLevelOption, ReviewerType } from '../types.svelte'
  import { REVIEWER_TYPE_CONFIG } from '../types.svelte'

  interface Props {
    skillReviews: SerializedSkillReview[]
    proficiencyLevels: ProficiencyLevelOption[]
  }

  const { skillReviews, proficiencyLevels }: Props = $props()
  const { t } = useTranslation()

  function getLevelInfo(
    code: string
  ): ProficiencyLevelOption | FrontendCanonicalProficiencyLevelOption | null {
    return proficiencyLevels.find((l) => l.value === code) ??
      findFrontendCanonicalProficiencyLevelOption(code)
  }

  function getReviewerTypeLabel(reviewerType: ReviewerType | null | undefined) {
    if (!reviewerType) return t('task.reviews.summary.reviewer', {}, 'Reviewer')

    return t(
      `task.reviews.reviewer_type.${reviewerType}`,
      {},
      REVIEWER_TYPE_CONFIG[reviewerType].label
    )
  }

  function getProficiencyLabel(
    level: ProficiencyLevelOption | FrontendCanonicalProficiencyLevelOption
  ): string {
    return t(`user.proficiency_levels.labels.${level.value}`, {}, level.label)
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
    return Array.from(map.entries()).map(([reviewerId, reviews]) => {
      const firstReview = reviews[0]
      if (!firstReview) {
        return {
          reviewerId,
          reviewerName: t('task.reviews.summary.anonymous', {}, 'Anonymous'),
          reviewerType: null,
          reviews,
        }
      }

      const reviewerName = firstReview.reviewer?.username ?? t('task.reviews.summary.anonymous', {}, 'Anonymous')

      return {
        reviewerId,
        reviewerName,
        reviewerType: firstReview.reviewer_type,
        reviews,
      }
    })
  })
</script>

{#if skillReviews.length === 0}
  <div class="text-sm text-muted-foreground py-4 text-center">
    {t('task.reviews.summary.empty', {}, 'No reviews have been submitted.')}
  </div>
{:else}
  <div class="space-y-6">
    {#each groupedByReviewer as group (group.reviewerId)}
      <div class="space-y-3">
        <div class="flex items-center gap-2">
          <span class="text-sm font-medium">{group.reviewerName}</span>
          <Badge variant="outline" class="text-[10px]">
            {getReviewerTypeLabel(group.reviewerType)}
          </Badge>
        </div>
        <div class="rounded-lg border overflow-hidden">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b bg-muted/50">
                <th class="text-left px-3 py-2 font-medium">{t('task.reviews.summary.skill', {}, 'Skill')}</th>
                <th class="text-left px-3 py-2 font-medium">{t('task.reviews.summary.level', {}, 'Level')}</th>
                <th class="text-left px-3 py-2 font-medium">{t('task.reviews.summary.comment', {}, 'Comment')}</th>
              </tr>
            </thead>
            <tbody>
              {#each group.reviews as sr (sr.id)}
                {@const level = getLevelInfo(sr.assigned_public_proficiency_code)}
                <tr class="border-b last:border-b-0">
                  <td class="px-3 py-2">{sr.skill?.skill_name ?? sr.skill_id}</td>
                  <td class="px-3 py-2">
                    {#if level}
                      <div class="flex items-center gap-1.5">
                        <span
                          class="inline-block w-2 h-2 rounded-full shrink-0"
                          style="background-color: {level.colorHex}"
                        ></span>
                        <span>{getProficiencyLabel(level)}</span>
                      </div>
                    {:else}
                      <span class="text-muted-foreground capitalize">{sr.assigned_public_proficiency_code}</span>
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
