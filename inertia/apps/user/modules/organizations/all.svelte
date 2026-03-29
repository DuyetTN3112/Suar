<script lang="ts">
  import { router } from '@inertiajs/svelte'
  import { Building, Users } from 'lucide-svelte'

  import Badge from '@/apps/user/shared/ui/badge.svelte'
  import Button from '@/apps/user/shared/ui/button.svelte'
  import Card from '@/apps/user/shared/ui/card.svelte'
  import CardContent from '@/apps/user/shared/ui/card_content.svelte'
  import CardFooter from '@/apps/user/shared/ui/card_footer.svelte'
  import CardHeader from '@/apps/user/shared/ui/card_header.svelte'
  import CardTitle from '@/apps/user/shared/ui/card_title.svelte'
  import { FRONTEND_ROUTES } from '@/apps/user/shared/constants/routes'
  import type { OffsetPagePagination } from '@/apps/user/shared/lib/pagination'
  import { requestOrganizationSwitch } from '@/apps/user/shared/lib/workspace_switcher'
  import AppLayout from '@/apps/user/shared/layouts/app_layout.svelte'
  import { notificationStore } from '@/apps/user/shared/stores/notification_store.svelte'
  import { useTranslation } from '@/apps/user/shared/stores/translation.svelte'
  import UnifiedOffsetPagination from '@/apps/user/shared/ui/unified_offset_pagination.svelte'

  interface Organization {
    id: string
    name: string
    description: string | null
    logo: string | null
    website: string | null
    owner: string | null
    employee_count: number | null
    project_count: number | null
    membership_status?: 'pending' | 'approved' | 'rejected' | null
  }

  interface Props {
    shellMode?: 'app' | 'organization'
    auth?: { user?: { current_organization_role?: string | null } }
    organizations: Organization[]
    pagination: OffsetPagePagination
    filters: {
      search?: string
    }
    currentOrganizationId: string | null
  }
  interface JoinOrganizationResponse {
    data?: {
      message?: string
      organization?: {
        id?: string
        name?: string
      }
      joinRequest?: {
        status?: string | null
      }
    }
  }

  const { organizations, pagination, currentOrganizationId }: Props = $props()
  const { t } = useTranslation()

  function buildQueryParams(page?: number): Record<string, string> {
    const queryParams: Record<string, string> = {}

    if (page && page > 1) queryParams.page = String(page)

    return queryParams
  }

  async function handleSwitchOrganization(id: string) {
    try {
      const result = await requestOrganizationSwitch({ organizationId: id })
      notificationStore.success(result.message ?? t('organization.index.switch_success', {}, 'Organization switched successfully'))
      router.visit(result.redirect ?? FRONTEND_ROUTES.PROJECTS, {
        preserveState: false,
        preserveScroll: false,
        replace: true,
      })
    } catch (error) {
      notificationStore.error(
        error instanceof Error ? error.message : t('organization.index.switch_error', {}, 'Unable to switch organization')
      )
    }
  }

  async function handleJoinOrganization(id: string) {
    try {
      const csrfToken = document.head.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
      if (!csrfToken) {
        notificationStore.error(t('organization.index.csrf_missing', {}, 'CSRF token not found. Please reload the page.'))
        return
      }

      const response = await fetch(`/organizations/${id}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-CSRF-TOKEN': csrfToken,
        },
        credentials: 'same-origin',
      })

      const data = (await response.json()) as JoinOrganizationResponse
      if (response.ok && data.data) {
        notificationStore.success(data.data.message ?? t('organization.index.join_success', {}, 'Organization join request sent'))
        router.reload()
      } else {
        notificationStore.error(data.data?.message ?? t('organization.index.join_error', {}, 'Unable to join organization'))
      }
    } catch (error) {
      console.error('Organization join failed:', error)
      notificationStore.error(t('organization.index.request_error', {}, 'An error occurred while processing the request'))
    }
  }
</script>

<svelte:head>
  <title>{t('organization.index.page_title', {}, 'Organizations')}</title>
</svelte:head>

<AppLayout title={t('organization.index.page_title', {}, 'Organizations')}>
  <div class="container py-4 space-y-4">
    <div class="flex justify-between items-center">
      <h1 class="text-2xl font-bold">{t('organization.index.title', {}, 'Organizations')}</h1>
    </div>

    {#if organizations.length === 0}
      <div class="text-center py-12">
        <Building class="h-12 w-12 mx-auto text-muted-foreground mb-3" />
        <p class="text-muted-foreground font-bold">{t('organization.no_organizations', {}, 'No organizations found')}</p>
      </div>
    {:else}
      <div class="grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {#each organizations as org (org.id)}
          <Card class={`border-2 shadow-neo overflow-hidden transition-all duration-200 hover:translate-x-[-2px] hover:translate-y-[-2px] ${org.id === currentOrganizationId ? 'ring-2 ring-primary' : ''}`}>
            <CardHeader class="p-3 pb-1">
              <CardTitle class="text-sm flex items-center gap-2">
                {#if org.logo}
                  <img src={org.logo} alt={org.name} class="h-5 w-5 rounded-md" />
                {:else}
                  <Building class="h-4 w-4" />
                {/if}
                <span class="truncate font-bold">{org.name}</span>
                {#if org.id === currentOrganizationId}
                  <Badge variant="default" class="ml-auto text-xs py-0 h-4">{t('organization.index.join_current', {}, 'Current')}</Badge>
                {/if}
              </CardTitle>
            </CardHeader>
            <CardContent class="p-3 pt-0 pb-1">
              {#if org.description}
                <p class="text-xs text-muted-foreground line-clamp-2">{org.description}</p>
              {/if}
              <div class="flex items-center gap-2 flex-wrap">
                {#if org.employee_count != null}
                  <span class="text-xs text-muted-foreground flex items-center gap-1">
                    <Users class="h-3 w-3" />
                    {org.employee_count}
                  </span>
                {/if}
              </div>
            </CardContent>
            <CardFooter class="p-3 pt-1 gap-1">
              <div class="flex gap-1 w-full">
                {#if org.membership_status === 'approved' || org.id === currentOrganizationId}
                  {#if org.id === currentOrganizationId}
                    <Button variant="outline" size="sm" class="flex-1 h-7 text-xs font-bold" disabled>
                      {t('organization.index.join_current', {}, 'Current')}
                    </Button>
                  {:else}
                    <Button size="sm" class="flex-1 h-7 text-xs font-bold" onclick={() => handleSwitchOrganization(org.id)}>
                      {t('organization.index.join_switch', {}, 'Switch')}
                    </Button>
                  {/if}
                {:else if org.membership_status === 'pending'}
                  <Button variant="outline" size="sm" class="flex-1 h-7 text-xs font-bold" disabled>
                    {t('organization.index.join_pending', {}, 'Pending approval')}
                  </Button>
                {:else}
                  <Button size="sm" class="flex-1 h-7 text-xs font-bold" onclick={() => handleJoinOrganization(org.id)}>
                    {t('organization.index.join_button', {}, 'Join')}
                  </Button>
                {/if}
              </div>
            </CardFooter>
          </Card>
        {/each}
      </div>

    {/if}

    <div class="border-t border-border pt-4 mt-6">
      <UnifiedOffsetPagination
        pagination={pagination}
        baseUrl="/all-organizations"
        queryParams={buildQueryParams()}
        class="pt-0"
      />
    </div>
  </div>
</AppLayout>
