<script lang="ts">
  import { page } from '@inertiajs/svelte'
  import axios from 'axios'
  import { Bookmark } from 'lucide-svelte'
  import { onMount } from 'svelte'

  import Button from '@/components/ui/button.svelte'
  import Card from '@/components/ui/card.svelte'
  import CardContent from '@/components/ui/card_content.svelte'
  import CardHeader from '@/components/ui/card_header.svelte'
  import CardTitle from '@/components/ui/card_title.svelte'
  import Input from '@/components/ui/input.svelte'
  import Label from '@/components/ui/label.svelte'
  import Textarea from '@/components/ui/textarea.svelte'
  import AppLayout from '@/layouts/app_layout.svelte'
import OrganizationLayout from '@/layouts/organization_layout.svelte'
  import { useTranslation } from '@/stores/translation.svelte'

  import ProfileFeaturedReviewsSection from './components/profile_featured_reviews_section.svelte'
  import ProfileOverviewSection from './components/profile_overview_section.svelte'
  import ProfileSkillsAndChartsSection from './components/profile_skills_and_charts_section.svelte'
  import { navigateToProfileEdit, navigateToUserReviews } from './profile_navigation'
  import {
    buildGroupedSkillsByCategory,
    createGroupedSkillsFromSpiderData,
    normalizeProfileSkillRelation,
  } from './profile_view_helpers'
  import type { ProfileViewProps } from './types.svelte'

  interface DeliveryMetrics {
    delivery: {
      total_tasks_completed: number
      tasks_late: number
      late_percentage: number
      estimate_accuracy_percentage: number
      tasks_on_time: number
      avg_hours_over_estimate: number
    }
    skill_aggregation: {
      total_skills: number
      reviewed_skills: number
      avg_percentage: number
    }
    years_of_experience: number
    joined_at_formatted: string
  }

  interface FeaturedReview {
    skill_id: string
    skill_name: string
    level_code: string
    avg_percentage: number
    total_reviews: number
    reviewer_name: string
    reviewer_role: string
    stars: number
    content: string
    task_name: string
  }

  interface Props {
    shellMode?: 'app' | 'organization'
    auth?: { user?: { current_organization_role?: string | null } }
    user: ProfileViewProps['user']
    completeness: ProfileViewProps['completeness']
    spiderChartData: ProfileViewProps['spiderChartData']
    isOwnProfile: ProfileViewProps['isOwnProfile']
    deliveryMetrics: DeliveryMetrics
    featuredReviews: FeaturedReview[]
  }

  const {
    user,
    completeness: _completeness,
    spiderChartData,
    isOwnProfile,
    deliveryMetrics,
    featuredReviews,
  }: Props = $props()
  const currentOrgRole = $derived((page as { props: { auth?: { user?: { current_organization_role?: string | null } } } }).props.auth?.user?.current_organization_role ?? null)
  const Layout = $derived(currentOrgRole === 'org_owner' || currentOrgRole === 'org_admin' ? OrganizationLayout : AppLayout)
  const { t } = useTranslation()
  const authUserId = $derived(
    (page as { props: { auth?: { user?: { id?: string } } } }).props.auth?.user?.id ?? null
  )

  const pageTitle = $derived(isOwnProfile ? t('profile.show', {}, 'Hồ sơ cá nhân') : `${user.username} - Hồ sơ`)

  const userSkills = $derived((user.skills ?? []).map((s) => normalizeProfileSkillRelation(s)))

  const groupedSkills = $derived(() => buildGroupedSkillsByCategory(userSkills))

  const fallbackGroupedSkills = $derived.by(() => {
    const fromSpider = [
      createGroupedSkillsFromSpiderData('technical', spiderChartData.technical),
      createGroupedSkillsFromSpiderData('soft_skill', spiderChartData.soft_skills),
      createGroupedSkillsFromSpiderData('delivery', spiderChartData.delivery),
    ]

    return fromSpider.filter((group) => group.items.length > 0)
  })

  const effectiveGroupedSkills = $derived.by(() => {
    const direct = groupedSkills()
    return direct.length > 0 ? direct : fallbackGroupedSkills
  })

  const totalReviews = $derived(userSkills.reduce((sum, s) => sum + s.total_reviews, 0))

  const normalizedGroupedSkills = $derived(
    effectiveGroupedSkills.map((group) => ({
      code: group.code,
      title: group.title,
      bgClass: group.badgeClass,
      items: group.items,
    }))
  )

  const neoBrutalCard = 'border border-border rounded-lg p-4 bg-white'

  interface RecruiterBookmark {
    id: string
    talent_user_id: string
    talent_username?: string | null
    notes?: string | null
    folder?: string | null
    rating?: number | null
  }

  let bookmark = $state<RecruiterBookmark | null>(null)
  let bookmarkLoading = $state(false)
  let bookmarkSaving = $state(false)
  let bookmarkError = $state('')
  let bookmarkForm = $state({
    notes: '',
    folder: '',
    rating: '5',
  })

  function goToReviews() {
    navigateToUserReviews(user.id)
  }

  function goToEditProfile() {
    navigateToProfileEdit()
  }

  async function loadBookmark() {
    if (isOwnProfile) return

    bookmarkLoading = true
    bookmarkError = ''

    try {
      const response = await axios.get('/api/recruiter-bookmarks')
      const bookmarks = Array.isArray(response.data) ? response.data as RecruiterBookmark[] : []
      const existing = bookmarks.find((entry) => entry.talent_user_id === user.id) ?? null
      bookmark = existing

      if (existing) {
        bookmarkForm = {
          notes: existing.notes ?? '',
          folder: existing.folder ?? '',
          rating: String(existing.rating ?? 5),
        }
      }
    } catch (error) {
      console.error('Error loading recruiter bookmarks:', error)
      bookmarkError = 'Không tải được trạng thái bookmark talent.'
    } finally {
      bookmarkLoading = false
    }
  }

  async function saveBookmark() {
    if (bookmarkSaving || isOwnProfile) return

    bookmarkSaving = true
    bookmarkError = ''

    try {
      if (bookmark) {
        await axios.patch(`/api/recruiter-bookmarks/${bookmark.id}`, {
          notes: bookmarkForm.notes.trim() || undefined,
          folder: bookmarkForm.folder.trim() || undefined,
          rating: Number(bookmarkForm.rating),
        })
      } else {
        await axios.post(`/api/org/talents/${user.id}/bookmarks`, {
          notes: bookmarkForm.notes.trim() || undefined,
          folder: bookmarkForm.folder.trim() || undefined,
          rating: Number(bookmarkForm.rating),
        })
      }

      await loadBookmark()
    } catch (error) {
      console.error('Error saving recruiter bookmark:', error)
      bookmarkError = 'Không lưu được bookmark talent.'
    } finally {
      bookmarkSaving = false
    }
  }

  async function removeBookmark() {
    if (!bookmark || bookmarkSaving) return

    bookmarkSaving = true
    bookmarkError = ''

    try {
      await axios.delete(`/api/org/talents/${user.id}/bookmarks`)
      bookmark = null
    } catch (error) {
      console.error('Error removing recruiter bookmark:', error)
      bookmarkError = 'Không gỡ được bookmark talent.'
    } finally {
      bookmarkSaving = false
    }
  }

  onMount(async () => {
    if (!authUserId || isOwnProfile) return
    await loadBookmark()
  })
</script>

<svelte:head>
  <title>{pageTitle}</title>
</svelte:head>

<Layout title={pageTitle}>
  <div class="w-full space-y-3 px-4 py-4 sm:px-6 lg:px-8">
    <ProfileOverviewSection {user} {deliveryMetrics} />

    <div class="flex justify-end gap-2">
      <Button variant="outline" size="sm" onclick={goToReviews}>Xem đánh giá</Button>
      {#if isOwnProfile}
        <Button variant="outline" size="sm" onclick={goToEditProfile}>Chỉnh sửa</Button>
      {/if}
    </div>

    {#if !isOwnProfile}
      <Card class="border border-border shadow-xs rounded-md px-2 py-1">
        <CardHeader>
          <CardTitle class="flex items-center gap-2">
            <Bookmark class="size-4" />
            Lưu talent
          </CardTitle>
        </CardHeader>
        <CardContent class="space-y-3">
          {#if bookmarkError}
            <div class="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {bookmarkError}
            </div>
          {/if}

          <div class="grid gap-3 md:grid-cols-2">
            <div class="space-y-2 md:col-span-2">
              <Label for="bookmark-notes">Ghi chú recruiter</Label>
              <Textarea
                id="bookmark-notes"
                bind:value={bookmarkForm.notes}
                rows={3}
                placeholder="Điểm mạnh, context phỏng vấn, dự án phù hợp..."
              />
            </div>
            <div class="space-y-2">
              <Label for="bookmark-folder">Folder</Label>
              <Input id="bookmark-folder" bind:value={bookmarkForm.folder} placeholder="Frontend bench" />
            </div>
            <div class="space-y-2">
              <Label for="bookmark-rating">Rating</Label>
              <Input id="bookmark-rating" bind:value={bookmarkForm.rating} min="1" max="5" type="number" />
            </div>
          </div>

          <div class="flex flex-wrap items-center justify-between gap-2">
            <p class="text-sm text-muted-foreground">
              {#if bookmarkLoading}
                Đang tải bookmark...
              {:else if bookmark}
                Đã lưu talent này trong recruiter bookmarks.
              {:else}
                Talent này chưa được lưu.
              {/if}
            </p>

            <div class="flex gap-2">
              {#if bookmark}
                <Button variant="outline" size="sm" disabled={bookmarkSaving} onclick={removeBookmark}>
                  Gỡ lưu
                </Button>
              {/if}
              <Button size="sm" disabled={bookmarkSaving || bookmarkLoading} onclick={saveBookmark}>
                {bookmarkSaving ? 'Đang lưu...' : bookmark ? 'Cập nhật bookmark' : 'Lưu talent'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    {/if}

    <ProfileSkillsAndChartsSection
      groupedSkills={normalizedGroupedSkills}
      {spiderChartData}
      {neoBrutalCard}
    />

    <ProfileFeaturedReviewsSection
      featuredReviews={featuredReviews}
      reviewedSkillsCount={totalReviews}
    />
  </div>
</Layout>
