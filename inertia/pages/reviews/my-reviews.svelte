<script lang="ts">
  /**
   * My Reviews Page — GET /my-reviews
   * Shows the current user's review history, grouped by status.
   */
  import { page, router } from '@inertiajs/svelte'
  import { FileSearch } from 'lucide-svelte'

  import AppLayout from '@/layouts/app_layout.svelte'
  import OrganizationLayout from '@/layouts/organization_layout.svelte'
  import { useTranslation } from '@/stores/translation.svelte'

  import ReviewCard from './components/review_card.svelte'
  import SimplePagination from './components/simple_pagination.svelte'
  import type { MyReviewsProps, SerializedReviewSession } from './types.svelte'

  interface Props {
    shellMode?: 'app' | 'organization'
    auth?: { user?: { current_organization_role?: string | null } }
    reviews: MyReviewsProps['reviews']
    meta: MyReviewsProps['meta']
  }

  const { reviews, meta }: Props = $props()
  const currentOrgRole = $derived((page as { props: { auth?: { user?: { current_organization_role?: string | null } } } }).props.auth?.user?.current_organization_role ?? null)
  const Layout = $derived(currentOrgRole === 'org_owner' || currentOrgRole === 'org_admin' ? OrganizationLayout : AppLayout)
  const { t } = useTranslation()

  const pageTitle = $derived(t('review.my_reviews', {}, 'Đánh giá của tôi'))

  const groupedReviews = $derived(() => {
    const inReview = reviews.filter((r) => {
      if (r.status === 'disputed') return false
      if (r.status === 'pending' || r.status === 'in_progress') return true

      const confirmations = r.confirmations ?? []
      const revieweeConfirmation = confirmations.find((entry) => entry.user_id === r.reviewee_id)
      return revieweeConfirmation?.action !== 'confirmed'
    })

    const done = reviews.filter((r) => {
      if (r.status !== 'completed') return false
      const confirmations = r.confirmations ?? []
      const revieweeConfirmation = confirmations.find((entry) => entry.user_id === r.reviewee_id)
      return revieweeConfirmation?.action === 'confirmed'
    })

    const disputed = reviews.filter((r) => {
      if (r.status === 'disputed') return true
      const confirmations = r.confirmations ?? []
      return confirmations.some((entry) => entry.action === 'disputed')
    })

    return {
      inReview,
      done,
      disputed,
    }
  })

  const boardColumns = $derived(
    [
      {
        key: 'inReview',
        title: 'In review',
        subtitle: 'Đang chờ review/xác nhận',
        items: groupedReviews().inReview,
        tone: 'neutral',
      },
      {
        key: 'done',
        title: 'Done',
        subtitle: 'Đã hoàn tất review',
        items: groupedReviews().done,
        tone: 'done',
      },
      {
        key: 'disputed',
        title: 'Tranh chấp',
        subtitle: 'Cần admin xử lý',
        items: groupedReviews().disputed,
        tone: 'disputed',
      },
    ] as const
  )

  function handleReviewClick(review: SerializedReviewSession) {
    router.get(`/reviews/${review.id}`)
  }
</script>

<svelte:head>
  <title>{pageTitle}</title>
</svelte:head>

<Layout title={pageTitle}>
  <div class="min-w-0 min-w-0">
    <section class="bg-white border border-border rounded-2xl p-6 shadow-xs min-h-[540px]">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div class="font-medium uppercase tracking-wider text-xs text-muted-foreground flex items-center gap-2">User / Review</div>
          <h1 class="text-3xl font-bold tracking-tight text-foreground">{pageTitle}</h1>
          <p class="text-base text-muted-foreground max-w-3xl">
            Lịch sử các phiên đánh giá kỹ năng của bạn. Màn này dùng dạng lane để user đọc nhanh những phiên đang chờ review, đã xong và các phiên có tranh chấp.
          </p>
        </div>
      </div>

    {#if reviews.length === 0}
      <div class="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
        <FileSearch />
        <h2>Không có phiên review nào</h2>
        <p>Các task hoàn thành sẽ xuất hiện ở đây để đánh giá.</p>
      </div>
    {:else}
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          {#each boardColumns as column (column.key)}
            <section class="border border-border rounded-xl overflow-hidden {column.tone}">
              <header>
                <div>
                  <h2>{column.title}</h2>
                  <p>{column.subtitle}</p>
                </div>
                  <span>
                    {column.items.length}
                  </span>
              </header>

              <div class="border border-border rounded-xl overflow-hidden-body">
                {#if column.items.length === 0}
                  <div class="rounded-lg border border-dashed border-border px-4 py-6 text-center text-xs text-muted-foreground">
                    Chưa có item
                  </div>
                {:else}
                  {#each column.items as review (review.id)}
                    <ReviewCard {review} showReviewee={false} onClick={handleReviewClick} />
                  {/each}
                {/if}
              </div>
            </section>
          {/each}
      </div>
    {/if}

    <SimplePagination {meta} baseUrl="/my-reviews" />
    </section>
  </div>
</Layout>
