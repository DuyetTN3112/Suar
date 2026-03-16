<script lang="ts">
  /**
   * ProfileStats — displays key profile statistics.
   */
  import Card from '@/components/ui/card.svelte'
  import CardContent from '@/components/ui/card_content.svelte'
  import { Award, Star, BarChart3, Clock } from 'lucide-svelte'
  import type { SerializedUserProfile, UserSkillResult } from '../types.svelte'

  interface Props {
    user: SerializedUserProfile
    skills?: UserSkillResult[]
    class?: string
  }

  const { user, skills = [], class: className = '' }: Props = $props()

  const totalSkills = $derived(skills.length)
  const reviewedSkills = $derived(skills.filter((s) => s.total_reviews > 0).length)
  const avgPercentage = $derived(() => {
    const reviewed = skills.filter((s) => s.avg_percentage !== null)
    if (reviewed.length === 0) return null
    const sum = reviewed.reduce((acc, s) => acc + (s.avg_percentage ?? 0), 0)
    return sum / reviewed.length
  })

  const memberSince = $derived(() => {
    try {
      const d = new Date(user.created_at)
      if (isNaN(d.getTime())) return 'N/A'
      return d.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })
    } catch {
      return 'N/A'
    }
  })

  const stats = $derived([
    {
      icon: Award,
      label: 'Kỹ năng',
      value: `${totalSkills}`,
      sub: `${reviewedSkills} đã được đánh giá`,
    },
    {
      icon: Star,
      label: 'Điểm trung bình',
      value: avgPercentage() !== null ? `${avgPercentage()!.toFixed(1)}%` : 'N/A',
      sub: 'Dựa trên đánh giá',
    },
    {
      icon: BarChart3,
      label: 'Uy tín',
      value: user.trust_score !== null && user.trust_score !== undefined
        ? (user.trust_score).toFixed(1)
        : 'N/A',
      sub: user.trust_tier_code ?? 'Chưa xác định',
    },
    {
      icon: Clock,
      label: 'Thành viên từ',
      value: memberSince(),
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
