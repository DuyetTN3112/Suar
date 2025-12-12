<script lang="ts">
  import { router } from '@inertiajs/svelte'
  import { Building, Plus, ArrowRight } from 'lucide-svelte'

  import Button from '@/apps/user/shared/ui/button.svelte'
  import Card from '@/apps/user/shared/ui/card.svelte'
  import CardContent from '@/apps/user/shared/ui/card_content.svelte'
  import CardDescription from '@/apps/user/shared/ui/card_description.svelte'
  import CardFooter from '@/apps/user/shared/ui/card_footer.svelte'
  import CardHeader from '@/apps/user/shared/ui/card_header.svelte'
  import CardTitle from '@/apps/user/shared/ui/card_title.svelte'
  import UnifiedOffsetPagination from '@/apps/user/shared/ui/unified_offset_pagination.svelte'
  import type { OffsetPagePagination } from '@/apps/user/shared/lib/pagination'
  import { useTranslation } from '@/apps/user/shared/stores/translation.svelte'

  interface Organization {
    id: string
    name: string
    description: string | null
    logo: string | null
    website: string | null
  }

  interface Props {
    organizations: Array<
      Organization & {
        membership_status?: 'pending' | 'approved' | 'rejected' | null
      }
    >
    pagination: OffsetPagePagination
    filters: {
      search: string
    }
  }

  const { organizations, pagination }: Props = $props()
  const { t } = useTranslation()

  function handleJoinOrganization(id: string) {
    router.post(`/organizations/${id}/join`, {}, {
      preserveState: true,
      preserveScroll: true,
    })
  }

</script>

<svelte:head>
  <title>{t('common.error_pages.require_organization.title', {}, 'Organization required')}</title>
</svelte:head>

<div
  class="flex min-h-screen flex-col items-center justify-center bg-background py-12 text-foreground"
>
  <div class="w-full max-w-5xl px-4 text-center">
    <div class="mb-6 flex justify-center">
      <div
        class="flex h-24 w-24 items-center justify-center rounded-full bg-muted"
      >
        <Building class="h-12 w-12 text-muted-foreground" />
      </div>
    </div>

    <h1 class="text-4xl font-extrabold text-foreground">
      {t('common.error_pages.require_organization.heading', {}, 'Organization required')}
    </h1>
    <h2 class="mt-4 text-xl font-medium text-foreground">
      {t('common.error_pages.require_organization.subtitle', {}, 'Join or create an organization to access this feature')}
    </h2>
    <p class="mt-4 text-lg text-muted-foreground">
      {t('common.error_pages.require_organization.description', {}, 'To use the full system, you need to be a member of at least one organization.')}
    </p>

    <div class="mt-8">
      <div class="mb-6 flex items-center justify-between">
        <h3 class="text-xl font-semibold text-foreground">
          {t('common.error_pages.require_organization.available_title', {}, 'Available organizations')}
        </h3>
      </div>

      {#if pagination.total === 0}
        <Card class="mb-4 border-border bg-card shadow-sm">
          <CardContent class="pb-6 pt-6">
            <p class="text-muted-foreground">
              {t('common.error_pages.require_organization.no_match', {}, 'No organizations match your search.')}
            </p>
          </CardContent>
        </Card>
      {:else}
        <div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {#each organizations as org (org.id)}
            <Card
              class="overflow-hidden rounded-xl border border-border bg-card transition-all duration-200 hover:shadow-lg"
            >
              <CardHeader
                class="border-b border-border bg-muted/40 pb-3"
              >
                <CardTitle class="flex items-center gap-2 text-lg">
                  {#if org.logo}
                    <img src={org.logo} alt={org.name} class="h-6 w-6 rounded-md" />
                  {:else}
                    <Building class="h-5 w-5 text-muted-foreground" />
                  {/if}
                  {org.name}
                </CardTitle>
                <CardDescription class="line-clamp-2 h-10">
                  {org.description ?? t('common.error_pages.require_organization.no_description', {}, 'No description')}
                </CardDescription>
              </CardHeader>
              <CardContent class="py-4">
                {#if org.website}
                  <p class="truncate text-sm text-muted-foreground">
                    {t('common.error_pages.require_organization.website_label', {}, 'Website')}: <a
                      href={org.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      class="text-foreground hover:underline">{org.website}</a
                    >
                  </p>
                {/if}
              </CardContent>
              <CardFooter
                class="flex justify-end border-t border-border pt-0"
              >
                <Button onclick={() => { handleJoinOrganization(org.id); }} size="sm" class="w-full">
                  {t('common.error_pages.require_organization.join_button', {}, 'Join')} <ArrowRight class="ml-2 h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          {/each}
        </div>

        {#if true}
          <div class="mt-8 flex flex-col items-center gap-3">
            <p class="text-sm text-muted-foreground">
              {t(
                'common.error_pages.require_organization.page_count',
                { page: pagination.page, lastPage: pagination.lastPage, total: pagination.total },
                `Page ${pagination.page}/${pagination.lastPage} · ${pagination.total} organizations`
              )}
            </p>
            <UnifiedOffsetPagination
              pagination={pagination}
              baseUrl="/errors/require-organization"
              queryParams={{}}
            />
          </div>
        {/if}
      {/if}
    </div>

    <div class="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
      <Button size="lg" onclick={() => { router.get('/organizations'); }}>
        <Building class="mr-2 h-5 w-5" />
        {t('common.error_pages.require_organization.view_organizations', {}, 'View organizations')}
      </Button>
      <Button variant="outline" size="lg" onclick={() => { router.get('/organizations/create'); }}>
        <Plus class="mr-2 h-5 w-5" />
        {t('common.error_pages.require_organization.create_organization', {}, 'Create organization')}
      </Button>
    </div>
  </div>
</div>
