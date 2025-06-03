<script lang="ts">
  /**
   * Public Profile View Page — GET /users/:id/profile
   * Read-only view of another user's profile with spider chart.
   */
  import AppLayout from '@/layouts/app_layout.svelte'
  import { router } from '@inertiajs/svelte'
  import { useTranslation } from '@/stores/translation.svelte'
  import Card from '@/components/ui/card.svelte'
  import CardContent from '@/components/ui/card_content.svelte'
  import CardHeader from '@/components/ui/card_header.svelte'
  import CardTitle from '@/components/ui/card_title.svelte'
  import Button from '@/components/ui/button.svelte'
  import Separator from '@/components/ui/separator.svelte'
  import Tabs from '@/components/ui/tabs.svelte'
  import TabsContent from '@/components/ui/tabs_content.svelte'
  import TabsList from '@/components/ui/tabs_list.svelte'
  import TabsTrigger from '@/components/ui/tabs_trigger.svelte'
  import ProfileHeader from './components/profile_header.svelte'
  import ProfileCompleteness from './components/profile_completeness.svelte'
  import TrustScoreBadge from './components/trust_score_badge.svelte'
  import SpiderChart from '../reviews/components/spider_chart.svelte'
  import { ClipboardList, ExternalLink } from 'lucide-svelte'
  import type { ProfileViewProps } from './types.svelte'

  interface Props {
    user: ProfileViewProps['user']
    completeness: ProfileViewProps['completeness']
    spiderChartData: ProfileViewProps['spiderChartData']
    isOwnProfile: ProfileViewProps['isOwnProfile']
  }

  const { user, completeness, spiderChartData, isOwnProfile }: Props = $props()
  const { t } = useTranslation()

  const pageTitle = $derived(
    isOwnProfile
      ? t('profile.show', {}, 'Hồ sơ cá nhân')
      : `${user.username} — Hồ sơ`
  )

  function goToReviews() {
    router.get(`/users/${user.id}/reviews`)
  }

  function goToEditProfile() {
    router.get('/profile/edit')
  }
</script>

<svelte:head>
  <title>{pageTitle}</title>
</svelte:head>

<AppLayout title={pageTitle}>
  <div class="p-4 sm:p-6 space-y-6 max-w-5xl mx-auto">
    <!-- Header -->
    <Card>
      <CardContent class="p-6">
        <div class="flex items-start justify-between gap-6">
          <ProfileHeader {user} showEditButton={isOwnProfile} />
          <ProfileCompleteness {completeness} />
        </div>

        <Separator class="my-4" />

        <div class="flex items-center justify-between">
          <TrustScoreBadge
            trustScore={user.trust_score as number | null}
            trustTierCode={user.trust_tier_code as string | null}
            credibilityScore={user.credibility_score as number | null}
          />

          <div class="flex items-center gap-2">
            <Button variant="outline" size="sm" onclick={goToReviews}>
              <ClipboardList class="h-3.5 w-3.5 mr-1.5" />
              Xem đánh giá
            </Button>
            {#if isOwnProfile}
              <Button variant="outline" size="sm" onclick={goToEditProfile}>
                <ExternalLink class="h-3.5 w-3.5 mr-1.5" />
                Chỉnh sửa
              </Button>
            {/if}
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- Spider Chart & Info -->
    <Tabs value="chart">
      <TabsList>
        <TabsTrigger value="chart">Biểu đồ kỹ năng</TabsTrigger>
        <TabsTrigger value="info">Thông tin</TabsTrigger>
      </TabsList>

      <TabsContent value="chart">
        <Card>
          <CardHeader>
            <CardTitle class="text-base">Biểu đồ Spider — Năng lực tổng quan</CardTitle>
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
            <CardTitle class="text-base">Thông tin cơ bản</CardTitle>
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
              {#if user.current_organization}
                <div>
                  <dt class="text-muted-foreground">Tổ chức</dt>
                  <dd class="font-medium">{user.current_organization.name}</dd>
                </div>
              {/if}
              {#if user.bio}
                <div class="sm:col-span-2">
                  <dt class="text-muted-foreground">Giới thiệu</dt>
                  <dd class="font-medium whitespace-pre-line">{user.bio}</dd>
                </div>
              {/if}
              <div>
                <dt class="text-muted-foreground">Tham gia từ</dt>
                <dd class="font-medium">
                  {new Date(user.created_at).toLocaleDateString('vi-VN', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  })}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  </div>
</AppLayout>
