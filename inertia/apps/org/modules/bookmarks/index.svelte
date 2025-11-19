<script lang="ts">
  import Card from '@/apps/org/shared/ui/card.svelte'
  import CardContent from '@/apps/org/shared/ui/card_content.svelte'
  import CardHeader from '@/apps/org/shared/ui/card_header.svelte'
  import CardTitle from '@/apps/org/shared/ui/card_title.svelte'
  import OrganizationLayout from '@/apps/org/shared/layouts/organization_layout.svelte'
  import UnifiedOffsetPagination from '@/apps/org/shared/ui/unified_offset_pagination.svelte'
  import type { OffsetPagePagination } from '@/apps/org/shared/lib/pagination'
  import { useTranslation } from '@/apps/org/shared/stores/translation.svelte'

  interface BookmarkItem {
    id: string
    notes: string | null
    folder: string | null
    rating: number | null
    created_at: string | null
    talent: {
      id: string
      username: string
      status?: string
      trust_score?: number | null
      reviewed_skills_count?: number
      imported_skills_count?: number
      under_dispute_skills_count?: number
      latest_confidence_signal?: 'low' | 'medium' | 'high' | null
    }
  }

  interface Props {
    bookmarks: BookmarkItem[]
    filters: {
      q?: string | null
      folder?: string | null
    }
    stats?: {
      total?: number
      folders?: string[]
    }
    pagination: OffsetPagePagination
  }

  const { bookmarks, filters, stats, pagination }: Props = $props()
  const { t } = useTranslation()
  const queryParams = $derived({
    q: filters.q,
    folder: filters.folder,
  })
</script>

<OrganizationLayout title={t('organization.bookmarks.page_title', {}, 'Saved talent')}>
  <div class="space-y-6">
    <div>
      <p class="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">{t('organization.bookmarks.eyebrow', {}, 'Recruiting')}</p>
      <h1 class="mt-1 text-3xl font-black text-foreground">{t('organization.bookmarks.title', {}, 'Saved talent')}</h1>
      <p class="mt-2 text-sm text-muted-foreground">{t('organization.bookmarks.summary', { count: stats?.total ?? pagination.total }, ':count profiles in shortlist.')}</p>
    </div>

    <Card>
      <CardHeader>
        <CardTitle>{t('organization.bookmarks.list_title', {}, 'Saved list')}</CardTitle>
      </CardHeader>
      <CardContent class="space-y-3">
        {#if bookmarks.length === 0}
          <p class="text-sm text-muted-foreground">{t('organization.bookmarks.empty', {}, 'No saved talent yet.')}</p>
        {:else}
          {#each bookmarks as bookmark (bookmark.id)}
            <article class="rounded-xl border border-border bg-background p-4">
              <div class="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p class="font-bold text-foreground">{bookmark.talent.username}</p>
                  <p class="mt-1 text-sm text-muted-foreground">{bookmark.notes ?? t('organization.bookmarks.notes_missing', {}, 'No notes yet')}</p>
                </div>
                <div class="flex flex-wrap items-center gap-2">
                  <span class="rounded-full border border-border px-2.5 py-1 text-xs font-bold text-muted-foreground">
                    {bookmark.folder ?? t('organization.bookmarks.folder_default', {}, 'Shortlist')}
                  </span>
                  <a
                    href={`/org/talents/${bookmark.talent.id}`}
                    class="rounded-md border border-border px-3 py-1.5 text-xs font-bold text-foreground hover:bg-muted"
                  >
                    {t('organization.bookmarks.view_profile', {}, 'View profile')}
                  </a>
                </div>
              </div>
            </article>
          {/each}
        {/if}

        <UnifiedOffsetPagination {pagination} baseUrl="/org/bookmarks" queryParams={queryParams} />
      </CardContent>
    </Card>
  </div>
</OrganizationLayout>
