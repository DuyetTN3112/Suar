<script lang="ts">
  import { router } from '@inertiajs/svelte'
  import { Building2, Calendar, Crown, FolderKanban, Users } from 'lucide-svelte'

  import Button from '@/apps/admin/shared/ui/button.svelte'
  import Card from '@/apps/admin/shared/ui/card.svelte'
  import CardContent from '@/apps/admin/shared/ui/card_content.svelte'
  import CardHeader from '@/apps/admin/shared/ui/card_header.svelte'
  import CardTitle from '@/apps/admin/shared/ui/card_title.svelte'
  import { currentDocumentLocale } from '@/apps/admin/shared/lib/date_locale'
  import UnifiedOffsetPagination from '@/apps/admin/shared/ui/unified_offset_pagination.svelte'
  import type { OffsetPagePagination } from '@/apps/admin/shared/lib/pagination'
  import AdminPageHeader from '@/apps/admin/shared/components/admin_page_header.svelte'
  import DataTableFilters from '@/apps/admin/shared/ui/data_table_filters.svelte'
  import type { FilterConfig } from '@/apps/admin/shared/ui/data_table_filters_types'
  import { useTranslation } from '@/apps/admin/shared/stores/translation.svelte'

  interface Organization {
    id: string
    name: string
    description: string | null
    owner: {
      id: string
      username: string
      email: string
    }
    created_at: string
    updated_at: string
    _count: {
      members: number
      projects: number
    }
  }

  interface Props {
    organizations: Organization[]
    pagination: OffsetPagePagination
    filters: {
      search?: string
    }
  }

  const props: Props = $props()
  const organizations = $derived(props.organizations)
  const pagination = $derived(props.pagination)
  const filters = $derived(props.filters)
  const { t } = useTranslation()

  let searchValue = $state('')
  const documentLocale = $derived(currentDocumentLocale() === 'vi' ? 'vi-VN' : 'en-US')
  const totalLabel = $derived(pagination.total.toLocaleString(documentLocale))

  $effect(() => {
    searchValue = filters.search ?? ''
  })

  function handleFilterChange(key: string, value: string) {
    if (key === 'search') searchValue = value

    router.get(
      '/admin/organizations',
      {
        search: searchValue || undefined,
        page: 1,
      },
      {
        preserveState: true,
        preserveScroll: true,
      }
    )
  }

  const filterConfigs = $derived([
    {
      key: 'search',
      type: 'search',
      placeholder: t('organization.admin_organizations.index.search_placeholder', {}, 'Search organization name...'),
    },
  ] satisfies FilterConfig[])

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString(documentLocale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }
</script>

<svelte:head>
  <title>Admin - {t('organization.admin_organizations.index.title', {}, 'Organizations')}</title>
</svelte:head>

<div class="space-y-6 animate-fade-in max-w-7xl mx-auto">
  <AdminPageHeader 
    title={t('organization.admin_organizations.index.title', {}, 'Organizations')}
    description={t('organization.admin_organizations.index.description', { count: totalLabel }, ':count active organizations in the system.')}
  >
    {#snippet actions()}
      <Button variant="outline" onclick={() => { router.visit('/organizations/create') }} class="bg-card hover:bg-muted text-foreground font-semibold">
        {t('organization.admin_organizations.index.create', {}, 'Create organization')}
      </Button>
    {/snippet}
  </AdminPageHeader>

  <DataTableFilters
    filters={filterConfigs}
    values={{ search: searchValue }}
    onFilterChange={handleFilterChange}
  />

  <Card>
    <CardHeader>
      <CardTitle>{t('organization.admin_organizations.index.list_title', { count: totalLabel }, 'Organization list (:count)')}</CardTitle>
    </CardHeader>
    <CardContent class="space-y-4">
      {#if organizations.length > 0}
        <div class="grid gap-4 xl:grid-cols-3 md:grid-cols-2">
          {#each organizations as org}
            <article class="flex h-full flex-col rounded-xl border border-border bg-background p-5 shadow-suar-hairline">
              <div class="flex items-start gap-3">
                <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Building2 class="h-5 w-5" />
                </div>

                <div class="min-w-0 space-y-1">
                  <h3 class="truncate text-lg font-semibold text-foreground">{org.name}</h3>
                  <p class="text-sm text-muted-foreground">
                    {org.description ?? t('organization.admin_organizations.index.no_description', {}, 'No description.')}
                  </p>
                </div>
              </div>

              <div class="mt-4 space-y-3 border-y border-border py-4 text-sm">
                <div class="flex items-center gap-2 text-muted-foreground">
                  <Crown class="h-4 w-4 shrink-0" />
                  <span class="font-medium text-foreground">{org.owner.username}</span>
                  <span class="truncate">{org.owner.email}</span>
                </div>

                <div class="grid grid-cols-2 gap-3">
                  <div class="rounded-lg bg-muted/30 p-3">
                    <div class="flex items-center gap-2 text-muted-foreground">
                      <Users class="h-4 w-4" />
                      <span class="text-xs uppercase tracking-wide">{t('organization.admin_organizations.index.members', {}, 'Members')}</span>
                    </div>
                    <p class="mt-2 text-2xl font-semibold text-foreground">{org._count.members}</p>
                  </div>

                  <div class="rounded-lg bg-muted/30 p-3">
                    <div class="flex items-center gap-2 text-muted-foreground">
                      <FolderKanban class="h-4 w-4" />
                      <span class="text-xs uppercase tracking-wide">{t('organization.admin_organizations.index.projects', {}, 'Projects')}</span>
                    </div>
                    <p class="mt-2 text-2xl font-semibold text-foreground">{org._count.projects}</p>
                  </div>
                </div>
              </div>

              <div class="mt-4 flex items-center justify-between gap-3">
                <div class="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar class="h-4 w-4" />
                  <span>{formatDate(org.created_at)}</span>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onclick={() => {
                    router.visit(`/admin/organizations/${org.id}`)
                  }}
                >
                  {t('organization.admin_organizations.index.view_detail', {}, 'View detail')}
                </Button>
              </div>
            </article>
          {/each}
        </div>
      {:else}
        <div class="rounded-lg border border-dashed border-border px-6 py-12 text-center">
          <h3 class="text-lg font-semibold text-foreground">{t('organization.admin_organizations.index.empty_title', {}, 'No organizations found')}</h3>
          <p class="mt-2 text-sm text-muted-foreground">
            {filters.search
              ? t('organization.admin_organizations.index.empty_search', {}, 'Try changing the search keyword.')
              : t('organization.admin_organizations.index.empty_system', {}, 'The system has no organizations yet.')}
          </p>
        </div>
      {/if}

      <div class="mt-4 border-t border-border pt-4">
        <UnifiedOffsetPagination
          {pagination}
          baseUrl="/admin/organizations"
          queryParams={{ search: filters.search ?? undefined }}
          class="pt-0"
        />
      </div>
    </CardContent>
  </Card>
</div>
