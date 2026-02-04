<script lang="ts">
  /**
   * ProfileStats — displays key profile statistics.
   */
  import { Award, Star, ChartColumn, Clock } from 'lucide-svelte'
  import { currentDocumentLocale } from '@/apps/user/shared/lib/date_locale'
  import { useTranslation } from '@/apps/user/shared/stores/translation.svelte'

  import Card from '@/apps/user/shared/ui/card.svelte'
  import CardContent from '@/apps/user/shared/ui/card_content.svelte'

  import type { SerializedUserProfile, UserSkillResult } from '../types.svelte'

  interface Props {
    user: SerializedUserProfile
    skills?: UserSkillResult[]
    class?: string
  }

  const { user, skills = [], class: className = '' }: Props = $props()
  const { t } = useTranslation()

  const totalSkills = $derived(skills.length)
  const reviewedSkills = $derived(skills.filter((s) => s.total_reviews > 0).length)
  const documentLocale = $derived(currentDocumentLocale() === 'vi' ? 'vi-VN' : 'en-US')
  const monthYearFormatter = $derived(
    new Intl.DateTimeFormat(documentLocale, {
      month: 'long',
      year: 'numeric',
    })
  )
  const avgPercentage = $derived.by(() => {
    const reviewed = skills.filter((s) => s.total_reviews > 0 && s.avg_percentage !== null)
    if (reviewed.length === 0) return null
    const sum = reviewed.reduce((acc, s) => acc + (s.avg_percentage ?? 0), 0)
    return sum / reviewed.length
  })

  const memberSince = $derived.by(() => {
    try {
    const d = new Date(user.created_at)
    if (isNaN(d.getTime())) return 'N/A'
      return monthYearFormatter.format(d)
    } catch {
      return 'N/A'
    }
  })

  const stats = $derived.by(() => [
    {
      icon: Award,
      label: t('ui_misc.profile.stats.skills', {}, 'Skills'),
      value: `${totalSkills}`,
      sub: t('ui_misc.profile.stats.reviewed_count', { count: reviewedSkills }, ':count reviewed'),
    },
    {
      icon: Star,
      label: t('ui_misc.profile.stats.average_score', {}, 'Average score'),
      value: avgPercentage !== null ? `${avgPercentage.toFixed(1)}%` : 'N/A',
      sub: t('ui_misc.profile.stats.based_on_reviews', {}, 'Based on reviews'),
    },
    {
      icon: ChartColumn,
      label: t('ui_misc.profile.stats.trust', {}, 'Trust'),
      value: typeof user.trust_score === 'number' ? user.trust_score.toFixed(1) : 'N/A',
      sub: user.trust_tier_code ?? t('ui_misc.profile.stats.unknown', {}, 'Unknown'),
    },
    {
      icon: Clock,
      label: t('ui_misc.profile.stats.member_since', {}, 'Member since'),
      value: memberSince,
      sub: '',
    },
  ])
</script>

<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 {className}">
  {#each stats as stat}
    <Card>
      <CardContent class="flex items-center gap-3 p-4">
        <div class="rounded-lg bg-muted p-2">
          <stat.icon class="h-5 w-5 text-muted-foreground" />
        </div>
        <div class="min-w-0">
          <p class="text-xs text-muted-foreground">{stat.label}</p>
          <p class="text-lg font-semibold truncate">{stat.value}</p>
          {#if stat.sub}
            <p class="text-[10px] text-muted-foreground truncate">{stat.sub}</p>
          {/if}
        </div>
      </CardContent>
    </Card>
  {/each}
</div>
