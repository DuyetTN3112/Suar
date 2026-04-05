<script lang="ts">
  import { page, router } from '@inertiajs/svelte'
  import { Plus, Building2 } from 'lucide-svelte'

  import Button from '@/apps/user/shared/ui/button.svelte'
  import DataTableFilters from '@/apps/user/shared/ui/data_table_filters.svelte'
  import type { FilterConfig } from '@/apps/user/shared/ui/data_table_filters_types'
  import Tabs from '@/apps/user/shared/ui/tabs.svelte'
  import TabsContent from '@/apps/user/shared/ui/tabs_content.svelte'
  import TabsList from '@/apps/user/shared/ui/tabs_list.svelte'
  import TabsTrigger from '@/apps/user/shared/ui/tabs_trigger.svelte'
  import AppLayout from '@/apps/user/shared/layouts/app_layout.svelte'
  import type { OffsetPagePagination } from '@/apps/user/shared/lib/pagination'
  import { requestOrganizationSwitch } from '@/apps/user/shared/lib/workspace_switcher'
  import { notificationStore } from '@/apps/user/shared/stores/notification_store.svelte'
  import { useTranslation } from '@/apps/user/shared/stores/translation.svelte'

  import OrganizationAvailableSection from './components/organization_available_section.svelte'
  import OrganizationDetailDialog from './components/organization_detail_dialog.svelte'
  import OrganizationUserMembershipsSection from './components/organization_user_memberships_section.svelte'
  import { joinOrganizationRequest } from './organizations_api'

  interface Organization {
    id: string
    name: string
    description: string | null
    logo: string | null
    website: string | null
    founded_date: string | null
    owner: string | null
    employee_count: number | null
    project_count: number | null
    industry: string | null
    location: string | null
    membership_status?: 'pending' | 'approved' | 'rejected' | null
  }

  interface Props {
    shellMode?: 'app' | 'organization'
    auth?: { user?: { current_organization_role?: string | null } }
    joinedOrganizations: Organization[]
    joinedPagination: OffsetPagePagination
    availableOrganizations: Organization[]
    availablePagination: OffsetPagePagination
    currentOrganizationId: string | null
    filters: {
      tab: 'joined' | 'available'
      search: string
      plan?: string
      partnerType?: string
      partnerIsActive?: boolean
    }
  }

  const {
    joinedOrganizations,
    joinedPagination,
    availableOrganizations,
    availablePagination,
    currentOrganizationId,
    filters,
  }: Props = $props()
  

  let searchTerm = $state('')
  let selectedOrg = $state<Organization | null>(null)
  let showDetailDialog = $state(false)
  let localCurrentOrgId = $state<string | null>(null)
  let activeTab = $state<'joined' | 'available'>('joined')
  const orgMembershipStatus = $state<Partial<Record<string, { status: string | null }>>>({})
  const { t } = useTranslation()

  $effect(() => {
    localCurrentOrgId = currentOrganizationId
  })

  $effect(() => {
    activeTab = joinedPagination.total === 0 ? 'available' : (filters.tab ?? 'joined')
    searchTerm = filters.search ?? ''
  })

  async function handleJoinOrganization(id: string) {
    try {
      const data = await joinOrganizationRequest(id)
      if (!data.data) {
        notificationStore.error(t('organization.index.join_error', {}, 'Unable to join organization'))
        return
      }

      notificationStore.success(data.data.message ?? t('organization.index.join_success', {}, 'Organization join request sent'))
      if (data.data.joinRequest) {
        orgMembershipStatus[id] = { status: data.data.joinRequest.status ?? 'pending' }
      }
      if (showDetailDialog) {
        showDetailDialog = false
      }
    } catch (error) {
      if ((error as Error).message === 'missing-csrf-token') {
        notificationStore.error(t('organization.index.csrf_missing', {}, 'CSRF token not found. Please reload the page.'))
        return
      }
      console.error('Organization join failed:', error)
      notificationStore.error(t('organization.index.request_error', {}, 'An error occurred while processing the request'))
    }
  }

  async function handleSwitchOrganization(id: string) {
    if (!id || id === localCurrentOrgId) return

    try {
      const result = await requestOrganizationSwitch({ organizationId: id })
      localCurrentOrgId = id
      if (showDetailDialog) {
        showDetailDialog = false
      }
      notificationStore.success(result.message ?? t('organization.index.switch_success', {}, 'Organization switched successfully'))
      router.visit(result.redirect ?? '/projects', {
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

  function handleShowDetails(org: Organization) {
    selectedOrg = org
    showDetailDialog = true
  }

  const hasOrganizations = $derived(joinedPagination.total > 0)
  const stats = $derived({
    organizations: joinedPagination.total,
    projects: joinedOrganizations.reduce((sum, org) => sum + (org.project_count ?? 0), 0),
    reviews: availablePagination.total,
  })

  function buildOrganizationsHref(overrides: {
    tab?: 'joined' | 'available'
    joinedPage?: number
    availablePage?: number
    search?: string
  } = {}) {
    const params = new URLSearchParams()
    params.set('tab', overrides.tab ?? activeTab)
    params.set('joined_page', String(overrides.joinedPage ?? joinedPagination.page))
    params.set('available_page', String(overrides.availablePage ?? availablePagination.page))

    const nextSearch = overrides.search ?? searchTerm
    if (nextSearch.trim().length > 0) {
      params.set('search', nextSearch.trim())
    }

    return `/organizations?${params.toString()}`
  }

  function visitOrganizations(overrides: Parameters<typeof buildOrganizationsHref>[0] = {}) {
    router.visit(buildOrganizationsHref(overrides), {
      preserveState: true,
      preserveScroll: true,
    })
  }

  function handleTabChange(tab: 'joined' | 'available') {
    activeTab = tab
    visitOrganizations({ tab })
  }

  function checkMembershipStatus(orgId: string) {
    if (joinedOrganizations.some((org) => org.id === orgId)) {
      return { isMember: true, status: 'approved' }
    }

    if (orgMembershipStatus[orgId] !== undefined) {
      return { isMember: false, status: orgMembershipStatus[orgId].status }
    }

    const org = availableOrganizations.find((item) => item.id === orgId)
    if (org?.membership_status) {
      return { isMember: org.membership_status === 'approved', status: org.membership_status }
    }

    return { isMember: false, status: null }
  }

  function renderJoinButton(org: Organization) {
    const { isMember, status } = checkMembershipStatus(org.id)

    if (isMember) {
      if (org.id === localCurrentOrgId) {
        return {
          variant: 'outline' as const,
          disabled: true,
          text: t('organization.index.join_current', {}, 'Current'),
        }
      }

      return {
        variant: 'default' as const,
        disabled: false,
        text: t('organization.index.join_switch', {}, 'Switch'),
        onClick: () => {
          void handleSwitchOrganization(org.id)
        },
      }
    }

    if (status === 'pending') {
      return {
        variant: 'outline' as const,
        disabled: true,
        text: t('organization.index.join_pending', {}, 'Pending approval'),
      }
    }

    if (status === 'rejected') {
      return {
        variant: 'outline' as const,
        disabled: false,
        text: t('organization.index.join_retry', {}, 'Send request again'),
        className: '!bg-[#ffe4da] hover:!bg-[#ffe4da]',
        onClick: () => handleJoinOrganization(org.id),
      }
    }

    return {
      variant: 'default' as const,
      disabled: false,
      text: t('organization.index.join_button', {}, 'Join'),
      onClick: () => handleJoinOrganization(org.id),
    }
  }

  const filterConfig = $derived([
    { key: 'plan', type: 'tabs', label: t('organization.index.filter_plan', {}, 'Plan'), options: [
      { value: 'free', label: t('organization.index.plan.free', {}, 'Free') },
      { value: 'starter', label: t('organization.index.plan.starter', {}, 'Starter') },
      { value: 'professional', label: t('organization.index.plan.professional', {}, 'Professional') },
      { value: 'enterprise', label: t('organization.index.plan.enterprise', {}, 'Enterprise') }
    ] },
    { key: 'partner_type', type: 'tabs', label: t('organization.index.filter_partner_type', {}, 'Partner tier'), options: [
      { value: 'bronze', label: t('organization.index.partner_type.bronze', {}, 'Bronze') },
      { value: 'silver', label: t('organization.index.partner_type.silver', {}, 'Silver') },
      { value: 'gold', label: t('organization.index.partner_type.gold', {}, 'Gold') }
    ] },
    { key: 'partner_is_active', type: 'tabs', label: t('organization.index.filter_partner_status', {}, 'Partner status'), options: [
      { value: 'true', label: t('organization.index.partner_status.active', {}, 'Active') },
      { value: 'false', label: t('organization.index.partner_status.inactive', {}, 'Inactive') }
    ] },
    { key: 'created_at', type: 'date_range', label: t('organization.index.filter_created_at', {}, 'Created at') },
  ] satisfies FilterConfig[])

  const filterValues = $derived.by(() => {
    const filterQueryValues: Record<string, string> = {}
    const query = new URLSearchParams((page.url ?? '').split('?')[1] ?? '')
    filterConfig.forEach(cfg => {
      if (cfg.type === 'date_range') {
        const start = query.get(`${cfg.key}_start`)
        const end = query.get(`${cfg.key}_end`)
        if (start) filterQueryValues[`${cfg.key}_start`] = start
        if (end) filterQueryValues[`${cfg.key}_end`] = end
      } else {
        const val = query.get(cfg.key)
        if (val) filterQueryValues[cfg.key] = val
      }
    })
    return filterQueryValues
  })

  function handleFilterChange(key: string, value: string) {
    const query = new URLSearchParams((page.url ?? '').split('?')[1] ?? '')
    if (value) {
      query.set(key, value)
    } else {
      query.delete(key)
    }
    // reset pagination for both tabs
    query.delete('joined_page')
    query.delete('available_page')
    router.get('/organizations', Object.fromEntries(query.entries()), {
      preserveState: true,
      preserveScroll: true
    })
  }

  function handleClearFilters() {
    const query = new URLSearchParams(page.url.split('?')[1] ?? '')
    const tab = query.get('tab')
    router.get('/organizations', tab ? { tab } : {}, {
      preserveState: true,
      preserveScroll: true
    })
  }
</script>

<svelte:head>
  <title>{t('organization.index.page_title', {}, 'Organizations')}</title>
</svelte:head>

<AppLayout title={t('organization.index.title', {}, 'Organizations')}>
  <div class="p-4 sm:p-6 lg:p-8 space-y-8 animate-fade-in">
    <div class="rounded-xl border border-border bg-secondary/40 p-6 shadow-suar-xs">
      <div class="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div class="space-y-2">
          <div class="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-primary">
            {t('organization.index.eyebrow', {}, 'Organizations')}
          </div>
          <h1 class="text-3xl font-black tracking-tight text-foreground">
            {t('organization.index.title', {}, 'Organizations')}
          </h1>
          <p class="text-muted-foreground text-sm md:text-base font-light max-w-3xl leading-relaxed">
            {#if hasOrganizations}
              {t('organization.index.subtitle_joined', {}, 'Choose an organization to enter work or create a new one.')}
            {:else}
              {t('organization.index.subtitle_empty', {}, 'You are not part of any organization yet.')}
            {/if}
          </p>
        </div>
        <div class="flex flex-col gap-3 min-w-[240px] w-full lg:w-auto">
          <Button
            variant="primary"
            class="w-full gap-2 justify-center"
            onclick={() => {
              router.visit('/organizations/create')
            }}
          >
            <Plus class="h-4 w-4" />
            {t('organization.index.create_button', {}, 'Create organization')}
          </Button>

          <!-- Stats Strip -->
          <div class="grid grid-cols-3 gap-2">
            <div class="rounded-lg border border-border bg-card p-2.5 text-center shadow-suar-xs">
              <span class="block text-primary text-lg font-black">{stats.organizations}</span>
              <span class="block text-[9px] font-bold text-muted-foreground uppercase tracking-wider">{t('organization.index.joined_stat', {}, 'Joined')}</span>
            </div>
            <div class="rounded-lg border border-border bg-card p-2.5 text-center shadow-suar-xs">
              <span class="block text-primary text-lg font-black">{stats.projects}</span>
              <span class="block text-[9px] font-bold text-muted-foreground uppercase tracking-wider">{t('organization.index.projects_stat', {}, 'Projects')}</span>
            </div>
            <div class="rounded-lg border border-border bg-card p-2.5 text-center shadow-suar-xs">
              <span class="block text-primary text-lg font-black">{stats.reviews}</span>
              <span class="block text-[9px] font-bold text-muted-foreground uppercase tracking-wider">{t('organization.index.available_stat', {}, 'Available')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="mt-4">
      <DataTableFilters
        filters={filterConfig}
        values={filterValues}
        onFilterChange={handleFilterChange}
      >
        <Button type="button" variant="outline" onclick={handleClearFilters}>
          {t('organization.index.clear_filters', {}, 'Clear filters')}
        </Button>
      </DataTableFilters>
    </div>

    <Tabs
      value={activeTab}
      onValueChange={(val: string) => {
        handleTabChange(val === 'available' ? 'available' : 'joined')
      }}
      class="w-full"
    >
      <TabsList class="grid w-full max-w-[400px] grid-cols-2 p-1 border border-border bg-secondary rounded-lg h-10 mb-6">
        <TabsTrigger value="joined" class="h-full rounded-md text-xs font-bold transition-all bg-transparent shadow-none hover:bg-background/50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs">
          {t('organization.index.joined_tab', { count: joinedPagination.total }, `Joined (${joinedPagination.total})`)}
        </TabsTrigger>
        <TabsTrigger value="available" class="h-full rounded-md text-xs font-bold transition-all bg-transparent shadow-none hover:bg-background/50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs">
          {t('organization.index.available_tab', { count: availablePagination.total }, `Available (${availablePagination.total})`)}
        </TabsTrigger>
      </TabsList>

          <TabsContent value="joined" class="mt-4">
            {#if hasOrganizations}
              <div class="memberships-panel">
                    <OrganizationUserMembershipsSection
                  pagination={joinedPagination}
                  organizations={joinedOrganizations}
                  currentOrganizationId={localCurrentOrgId}
                  baseUrl="/organizations"
                  pageParam="joined_page"
                  queryParams={{
                    tab: 'joined',
                    available_page: availablePagination.page,
                    search: filters.search || undefined,
                  }}
                  hideHeader={true}
                  onShowDetails={handleShowDetails}
                  onSwitchOrganization={handleSwitchOrganization}
                />
              </div>
            {:else}
              <div class="body-panel">
                <div class="empty-stage">
                  <div class="empty-card">
                    <div class="empty-illustration" aria-hidden="true">
                      <Building2 />
                    </div>
                    <h2>{t('organization.index.empty_joined_title', {}, 'You have not joined any organizations yet')}</h2>
                    <p>{t('organization.index.empty_joined_description', {}, 'Choose an available organization or create a new one.')}</p>
                    <div class="empty-actions">
                      <button
                        class="button-primary"
                        type="button"
                        onclick={() => { handleTabChange('available') }}
                      >
                        {t('organization.index.view_available', {}, 'View available organizations')}
                      </button>
                      <button
                        class="button-ghost"
                        type="button"
                        onclick={() => { router.visit('/organizations/create') }}
                      >
                        <Plus class="mr-1 h-4 w-4" /> {t('organization.index.create_button', {}, 'Create organization')}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            {/if}
          </TabsContent>

          <TabsContent value="available" class="mt-4">
            {#if availablePagination.total === 0}
              <div class="body-panel">
                <div class="empty-stage">
                  <div class="empty-card">
                    <div class="empty-illustration" aria-hidden="true">
                      <Building2 />
                    </div>

                    <h2>
                      {filters.search
                        ? t('organization.index.empty_available_match_title', {}, 'No organizations found')
                        : t('organization.index.empty_available_title', {}, 'No organizations yet')}
                    </h2>
                    <p>
                      {#if filters.search}
                        {t('organization.index.empty_available_match_description', { search: filters.search }, `No organizations match "${filters.search}".`)}
                      {:else}
                        {t('organization.index.empty_available_description', {}, 'Create a new organization to get started.')}
                      {/if}
                    </p>

                    <div class="empty-actions">
                      <button
                        class="button-primary"
                        type="button"
                        onclick={() => {
                          router.visit('/organizations/create')
                        }}
                      >
                        <Plus />
                        {t('organization.index.create_button', {}, 'Create organization')}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            {:else}
              <div class="available-panel">
                <OrganizationAvailableSection
                  pagination={availablePagination}
                  organizations={availableOrganizations}
                  baseUrl="/organizations"
                  pageParam="available_page"
                  queryParams={{
                    tab: 'available',
                    joined_page: joinedPagination.page,
                    search: filters.search || undefined,
                  }}
                  hideHeader={true}
                  onShowDetails={handleShowDetails}
                  {checkMembershipStatus}
                  {renderJoinButton}
                />
              </div>
            {/if}
          </TabsContent>
        </Tabs>
      </div>

  <OrganizationDetailDialog
    open={showDetailDialog}
    {selectedOrg}
    {localCurrentOrgId}
    {checkMembershipStatus}
    onSwitchOrganization={handleSwitchOrganization}
    onJoinOrganization={handleJoinOrganization}
    onOpenChange={(open: boolean) => {
      showDetailDialog = open
    }}
    onClose={() => { showDetailDialog = false }}
  />
</AppLayout>
