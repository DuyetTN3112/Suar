<script lang="ts">
  import { page } from '@inertiajs/svelte'
  import axios from 'axios'
  import { Bookmark } from 'lucide-svelte'
  import { onMount } from 'svelte'

  import Button from '@/apps/org/shared/ui/button.svelte'
  import Card from '@/apps/org/shared/ui/card.svelte'
  import CardContent from '@/apps/org/shared/ui/card_content.svelte'
  import CardHeader from '@/apps/org/shared/ui/card_header.svelte'
  import CardTitle from '@/apps/org/shared/ui/card_title.svelte'
  import Input from '@/apps/org/shared/ui/input.svelte'
  import Label from '@/apps/org/shared/ui/label.svelte'
  import Textarea from '@/apps/org/shared/ui/textarea.svelte'
  import OrganizationLayout from '@/apps/org/shared/layouts/organization_layout.svelte'
  import { useTranslation } from '@/apps/org/shared/stores/translation.svelte'

  import ProfileFeaturedReviewsSection from './components/profile_featured_reviews_section.svelte'
  import ProfileOverviewSection from './components/profile_overview_section.svelte'
  import ProfileSkillsAndChartsSection from './components/profile_skills_and_charts_section.svelte'
  import ProfileWorkHistorySection from './components/profile_work_history_section.svelte'
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
      avg_percentage: number | null
    }
    years_of_experience: number
    joined_at_formatted: string
  }

  interface FeaturedReview {
    skill_id: string
    skill_name: string
    verified_public_proficiency_code: string
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
    userSkills: ProfileViewProps['userSkills']
    completeness: ProfileViewProps['completeness']
    spiderChartData: ProfileViewProps['spiderChartData']
    isOwnProfile: ProfileViewProps['isOwnProfile']
    deliveryMetrics: DeliveryMetrics
    featuredReviews: FeaturedReview[]
    workHistory: ProfileViewProps['workHistory']
  }

  const {
    user,
    userSkills,
    completeness: _completeness,
    spiderChartData,
    isOwnProfile,
    deliveryMetrics,
    featuredReviews,
    workHistory,
  }: Props = $props()
  
  const { t } = useTranslation()
  const authUserId = $derived(
    (page as { props: { auth?: { user?: { id?: string } } } }).props.auth?.user?.id ?? null
  )

  const pageTitle = $derived(isOwnProfile ? t('common.personal_profile', {}, 'Personal profile') : `${user.username} - Profile`)

  const normalizedUserSkills = $derived(userSkills.map((s) => normalizeProfileSkillRelation(s)))

  const groupedSkills = $derived(() => buildGroupedSkillsByCategory(normalizedUserSkills))

  const fallbackGroupedSkills = $derived.by(() => {
    const fromSpider = [
      createGroupedSkillsFromSpiderData('technology', spiderChartData.technology),
      createGroupedSkillsFromSpiderData('engineering', spiderChartData.engineering),
      createGroupedSkillsFromSpiderData('soft_skill', spiderChartData.soft_skills),
      createGroupedSkillsFromSpiderData('delivery', spiderChartData.delivery),
    ]

    return fromSpider.filter((group) => group.items.length > 0)
  })

  const effectiveGroupedSkills = $derived.by(() => {
    const direct = groupedSkills()
    return direct.length > 0 ? direct : fallbackGroupedSkills
  })

  const totalReviews = $derived(normalizedUserSkills.reduce((sum, s) => sum + s.total_reviews, 0))

  const normalizedGroupedSkills = $derived(
    effectiveGroupedSkills.map((group) => ({
      code: group.code,
      title: group.title,
      bgClass: group.badgeClass,
      items: group.items,
    }))
  )

  const neoBrutalCard = 'border border-border rounded-lg p-4 bg-card'

  interface RecruiterBookmark {
    id: string
    talentUserId: string
    talentUsername?: string | null
    notes?: string | null
    folder?: string | null
    rating?: number | null
  }

  const BOOKMARKS_API_BASE = '/api/v1/recruiter-bookmarks'
  const ORG_TALENT_BOOKMARKS_API_BASE = '/api/v1/me/organizations/current/talents'

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
      const response = await axios.get<{ data: RecruiterBookmark[] }>(BOOKMARKS_API_BASE)
      const bookmarks = Array.isArray(response.data.data) ? response.data.data : []
      const existing = bookmarks.find((entry) => entry.talentUserId === user.id) ?? null
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
      bookmarkError = 'Unable to load talent bookmark state.'
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
        await axios.patch(`${BOOKMARKS_API_BASE}/${bookmark.id}`, {
          notes: bookmarkForm.notes.trim() || undefined,
          folder: bookmarkForm.folder.trim() || undefined,
          rating: Number(bookmarkForm.rating),
        })
      } else {
        await axios.post(`${ORG_TALENT_BOOKMARKS_API_BASE}/${user.id}/bookmarks`, {
          notes: bookmarkForm.notes.trim() || undefined,
          folder: bookmarkForm.folder.trim() || undefined,
          rating: Number(bookmarkForm.rating),
        })
      }

      await loadBookmark()
    } catch (error) {
      console.error('Error saving recruiter bookmark:', error)
      bookmarkError = 'Unable to save talent bookmark.'
    } finally {
      bookmarkSaving = false
    }
  }

  async function removeBookmark() {
    if (!bookmark || bookmarkSaving) return

    bookmarkSaving = true
    bookmarkError = ''

    try {
      await axios.delete(`${ORG_TALENT_BOOKMARKS_API_BASE}/${user.id}/bookmarks`)
      bookmark = null
    } catch (error) {
      console.error('Error removing recruiter bookmark:', error)
      bookmarkError = 'Unable to remove talent bookmark.'
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

<OrganizationLayout title={pageTitle}>
  <div class="w-full space-y-3 px-4 py-4 sm:px-6 lg:px-8">
    <ProfileOverviewSection {user} {userSkills} {deliveryMetrics} />

    <div class="flex justify-end gap-2">
      <Button variant="outline" size="sm" onclick={goToReviews}>View reviews</Button>
      {#if isOwnProfile}
        <Button variant="outline" size="sm" onclick={goToEditProfile}>Edit</Button>
      {/if}
    </div>

    {#if !isOwnProfile}
      <Card class="border border-border shadow-xs rounded-md px-2 py-1">
        <CardHeader>
          <CardTitle class="flex items-center gap-2">
            <Bookmark class="size-4" />
            Save talent
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
              <Label for="bookmark-notes">Recruiter notes</Label>
              <Textarea
                id="bookmark-notes"
                bind:value={bookmarkForm.notes}
                rows={3}
                placeholder="Strengths, interview context, suitable projects..."
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
                Loading bookmark...
              {:else if bookmark}
                This talent is already saved in recruiter bookmarks.
              {:else}
                This talent is not saved yet.
              {/if}
            </p>

            <div class="flex gap-2">
              {#if bookmark}
                <Button variant="outline" size="sm" disabled={bookmarkSaving} onclick={removeBookmark}>
                  Remove
                </Button>
              {/if}
              <Button size="sm" disabled={bookmarkSaving || bookmarkLoading} onclick={saveBookmark}>
                {bookmarkSaving ? 'Saving...' : bookmark ? 'Update bookmark' : 'Save talent'}
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

    <ProfileWorkHistorySection {workHistory} />

    <ProfileFeaturedReviewsSection
      featuredReviews={featuredReviews}
      reviewedSkillsCount={totalReviews}
    />
  </div>
</OrganizationLayout>
