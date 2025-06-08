<script lang="ts">
  /**
   * Profile Show Page — GET /profile
   * Displays the current user's own profile with spider chart, stats, and skills.
   */
  import AppLayout from '@/layouts/app_layout.svelte'
  import { page } from '@inertiajs/svelte'
  import { useTranslation } from '@/stores/translation.svelte'
  import Card from '@/components/ui/card.svelte'
  import CardContent from '@/components/ui/card_content.svelte'
  import CardHeader from '@/components/ui/card_header.svelte'
  import CardTitle from '@/components/ui/card_title.svelte'
  import Tabs from '@/components/ui/tabs.svelte'
  import TabsContent from '@/components/ui/tabs_content.svelte'
  import TabsList from '@/components/ui/tabs_list.svelte'
  import TabsTrigger from '@/components/ui/tabs_trigger.svelte'
  import Separator from '@/components/ui/separator.svelte'
  import ProfileHeader from './components/profile_header.svelte'
  import ProfileCompleteness from './components/profile_completeness.svelte'
  import ProfileStats from './components/profile_stats.svelte'
  import TrustScoreBadge from './components/trust_score_badge.svelte'
  import SpiderChart from '../reviews/components/spider_chart.svelte'
  import type { ProfileShowProps } from './types.svelte'

  interface Props {
    user: ProfileShowProps['user']
    completeness: ProfileShowProps['completeness']
    spiderChartData: ProfileShowProps['spiderChartData']
  }

  const { user, completeness, spiderChartData }: Props = $props()
  const { t } = useTranslation()

  const pageTitle = $derived(t('profile.show', {}, 'Hồ sơ cá nhân'))

  // Map serialized user.skills to UserSkillResult[] for ProfileStats
  const userSkills = $derived(
    (user.skills ?? []).map((s) => ({
      id: s.id,
      skill_id: s.skill_id,
      skill_name: s.skill?.skill_name ?? '',
      skill_code: s.skill?.skill_code ?? '',
      category_name: s.skill?.category_code ?? '',
      category_code: s.skill?.category_code ?? '',
      level_code: s.level_code,
      total_reviews: s.total_reviews,
      avg_score: s.avg_score,
      avg_percentage: s.avg_percentage,
      last_reviewed_at: s.last_reviewed_at,
    }))
  )

  // Flash messages
  const flash = $derived(($page as { props: { flash?: { success?: string; error?: string } } }).props.flash)
</script>

<svelte:head>
  <title>{pageTitle}</title>
</svelte:head>

<AppLayout title={pageTitle}>
  <div class="p-4 sm:p-6 space-y-6 max-w-5xl mx-auto">
    <!-- Flash messages -->
    {#if flash?.success}
      <div class="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200">
        {flash.success}
      </div>
    {/if}
    {#if flash?.error}
      <div class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
        {flash.error}
      </div>
    {/if}

    <!-- Top section: Header + Completeness -->
    <Card>
      <CardContent class="p-6">
        <div class="flex items-start justify-between gap-6">
          <ProfileHeader {user} showEditButton />
          <ProfileCompleteness {completeness} />
        </div>

        <Separator class="my-4" />

        <TrustScoreBadge
          trustScore={user.trust_score as number | null}
          trustTierCode={user.trust_tier_code as string | null}
          credibilityScore={user.credibility_score as number | null}
        />
      </CardContent>
    </Card>

    <!-- Stats -->
    <ProfileStats {user} skills={userSkills} />

    <!-- Tabs: Spider Chart / Info -->
    <Tabs value="chart">
      <TabsList>
        <TabsTrigger value="chart">Biểu đồ kỹ năng</TabsTrigger>
        <TabsTrigger value="info">Thông tin chi tiết</TabsTrigger>
      </TabsList>

      <TabsContent value="chart">
        <Card>
          <CardHeader>
            <CardTitle class="text-base">Biểu đồ Spider — Đánh giá kỹ năng</CardTitle>
          </CardHeader>
          <CardContent class="flex justify-center">
            <SpiderChart
              softSkills={spiderChartData.soft_skills}
              delivery={spiderChartData.delivery}
              size={350}
            />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="info">
        <Card>
          <CardHeader>
            <CardTitle class="text-base">Thông tin cá nhân</CardTitle>
          </CardHeader>
          <CardContent>
            <dl class="grid gap-4 sm:grid-cols-2 text-sm">
              <div>
                <dt class="text-muted-foreground">Tên đăng nhập</dt>
                <dd class="font-medium">{user.username}</dd>
              </div>
              <div>
                <dt class="text-muted-foreground">Email</dt>
                <dd class="font-medium">{user.email}</dd>
              </div>
              <div>
                <dt class="text-muted-foreground">Số điện thoại</dt>
                <dd class="font-medium">{user.phone ?? 'Chưa cập nhật'}</dd>
              </div>
              <div>
                <dt class="text-muted-foreground">Địa chỉ</dt>
                <dd class="font-medium">{user.address ?? 'Chưa cập nhật'}</dd>
              </div>
              <div>
                <dt class="text-muted-foreground">Múi giờ</dt>
                <dd class="font-medium">{user.timezone ?? 'Chưa cập nhật'}</dd>
              </div>
              <div>
                <dt class="text-muted-foreground">Tổ chức</dt>
                <dd class="font-medium">{user.current_organization?.name ?? 'Chưa tham gia'}</dd>
              </div>
              {#if user.bio}
                <div class="sm:col-span-2">
                  <dt class="text-muted-foreground">Giới thiệu</dt>
                  <dd class="font-medium whitespace-pre-line">{user.bio}</dd>
                </div>
              {/if}
            </dl>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  </div>
</AppLayout>
