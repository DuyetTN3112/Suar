<script lang="ts">
  import { page, router } from '@inertiajs/svelte'
  import { Building, ArrowRight } from 'lucide-svelte'

  import Badge from '@/apps/org/shared/ui/badge.svelte'
  import Button from '@/apps/org/shared/ui/button.svelte'
  import Dialog from '@/apps/org/shared/ui/dialog.svelte'
  import DialogContent from '@/apps/org/shared/ui/dialog_content.svelte'
  import DialogDescription from '@/apps/org/shared/ui/dialog_description.svelte'
  import DialogFooter from '@/apps/org/shared/ui/dialog_footer.svelte'
  import DialogHeader from '@/apps/org/shared/ui/dialog_header.svelte'
  import DialogTitle from '@/apps/org/shared/ui/dialog_title.svelte'
  import DataTableFilters from '@/apps/org/shared/ui/data_table_filters.svelte'
  import type { FilterConfig } from '@/apps/org/shared/ui/data_table_filters_types'
  import Table from '@/apps/org/shared/ui/table.svelte'
  import TableBody from '@/apps/org/shared/ui/table_body.svelte'
  import TableCell from '@/apps/org/shared/ui/table_cell.svelte'
  import TableHead from '@/apps/org/shared/ui/table_head.svelte'
  import TableHeader from '@/apps/org/shared/ui/table_header.svelte'
  import TableRow from '@/apps/org/shared/ui/table_row.svelte'
  import UnifiedOffsetPagination from '@/apps/org/shared/ui/unified_offset_pagination.svelte'
  import { FRONTEND_ROUTES } from '@/apps/org/shared/constants'
  import OrganizationLayout from '@/apps/org/shared/layouts/organization_layout.svelte'
  import { buildOffsetPagination } from '@/apps/org/shared/lib/pagination'
  import { formatDate } from '@/apps/org/shared/lib/utils'

  import { useTranslation } from '@/apps/org/shared/stores/translation.svelte'

  import ProjectDetailModal from './components/project_detail_modal.svelte'
  import type { Project, ProjectUserSummary } from './types'

  const { t } = useTranslation()

  interface Props {
    projects: Project[]
    pagination: {
      mode: 'offset' | 'cursor'
      page: number
      perPage: number
      total: number
      lastPage: number
      hasNextPage: boolean
      hasPreviousPage: boolean
    }
    filters: {
      search?: string
      status?: string
      creator_id?: string
      manager_id?: string
      visibility?: 'public' | 'private' | 'team'
      sort_by?: 'created_at' | 'name' | 'start_date' | 'end_date'
      sort_order?: 'asc' | 'desc'
    }
    stats: {
      total_projects: number
      active_projects: number
      completed_projects: number
    }
    auth: {
      user?: AuthProjectsUser | null
    }
    shellMode?: 'app' | 'organization'
    showOrganizationRequiredModal?: boolean
  }

  interface AuthProjectsUser extends ProjectUserSummary {
    current_organization_id: string | null
    current_organization_role: string | null
    isAdmin: boolean
  }

  const {
    projects,
    pagination,
    filters,
    stats = {
      total_projects: pagination?.total ?? projects.length,
      active_projects: 0,
      completed_projects: 0,
    },
    auth,
    showOrganizationRequiredModal = false,
  }: Props = $props()

  const authUser = $derived((auth?.user as AuthProjectsUser | undefined) ?? {
    id: '',
    username: '',
    email: '',
    current_organization_id: null,
    current_organization_role: null,
    isAdmin: false,
  })

  // Guard against undefined
  const safeProjects = $derived(projects)
  const projectPagination = $derived(buildOffsetPagination(pagination))
  const hasCurrentOrganization = $derived(Boolean(authUser.current_organization_id))


  let showOrganizationModal = $state(false)
  // Check if modal should show on mount
  $effect(() => {
    if (showOrganizationRequiredModal && !hasCurrentOrganization) {
      showOrganizationModal = true
    }
  })

  // Project detail modal state
  let detailModalOpen = $state(false)
  let selectedProjectId = $state<string | undefined>(undefined)



  function handleViewProject(id: string) {
    selectedProjectId = id
    detailModalOpen = true
  }

  function handleOpenProjectTasks(id: string) {
    router.visit(`/org/tasks/list?project_id=${id}`)
  }

  function handleProjectDeleted() {
    detailModalOpen = false
    selectedProjectId = undefined
    // Refresh projects list
    router.visit(FRONTEND_ROUTES.PROJECTS, { replace: true })
  }

  function handleGoToOrganizations() {
    router.get(FRONTEND_ROUTES.ORGANIZATIONS)
  }

  const filterConfig: FilterConfig[] = [
    { key: 'status', type: 'tabs', label: t('project.status', {}, 'Status'), options: [
      { value: 'all', label: t('common.all', {}, 'All') },
      { value: 'active', label: t('project.status_active', {}, 'Active') },
      { value: 'in_progress', label: t('project.status_in_progress', {}, 'In progress') },
      { value: 'on_hold', label: t('project.status_on_hold', {}, 'On hold') },
      { value: 'completed', label: t('project.status_completed', {}, 'Completed') },
      { value: 'archived', label: t('project.status_archived', {}, 'Archived') }
    ] },
    { key: 'visibility', type: 'tabs', label: t('project.visibility', {}, 'Visibility'), options: [
      { value: 'all', label: t('common.all', {}, 'All') },
      { value: 'public', label: t('project.visibility_public', {}, 'Public') },
      { value: 'private', label: t('project.visibility_private', {}, 'Private') },
      { value: 'team', label: t('project.visibility_team', {}, 'Team') }
    ] },
    { key: 'start_date', type: 'date_range', label: t('project.start_date', {}, 'Start Date') },
    { key: 'end_date', type: 'date_range', label: t('project.end_date', {}, 'End Date') },
    { key: 'created_at', type: 'date_range', label: t('project.created_at', {}, 'Created at') },
  ]

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
    if (value && value !== 'all') {
      query.set(key, value)
    } else {
      query.delete(key)
    }
    // reset pagination
    query.delete('page')
    router.get(FRONTEND_ROUTES.ORG_PROJECTS, Object.fromEntries(query.entries()), {
      preserveState: true,
      preserveScroll: true
    })
  }

  function handleClearFilters() {
    router.get(FRONTEND_ROUTES.ORG_PROJECTS, {}, {
      preserveState: true,
      preserveScroll: true
    })
  }

  const pageTitle = $derived(t('project.project_list', {}, 'Project Management'))
  function statusLabel(status?: string): string {
    if (!status) return t('project.status_unknown', {}, 'Unknown')

    switch (status) {
      case 'pending':
        return t('project.status_pending', {}, 'Pending')
      case 'active':
      case 'in_progress':
        return t('project.status_running', {}, 'Running')
      case 'completed':
        return t('project.status_completed', {}, 'Completed')
      case 'on_hold':
        return t('project.status_on_hold', {}, 'On hold')
      case 'archived':
        return t('project.status_archived', {}, 'Archived')
      case 'cancelled':
        return t('project.status_cancelled', {}, 'Cancelled')
      default:
        return status
    }
  }

  function visibilityLabel(visibility?: string | null): string {
    switch (visibility) {
      case 'public':
        return t('project.visibility_public', {}, 'Public')
      case 'private':
        return t('project.visibility_private', {}, 'Private')
      case 'team':
        return t('project.visibility_team', {}, 'Team')
      default:
        return visibility ?? t('project.status_unknown', {}, 'Unknown')
    }
  }

  function statusBadge(
    status?: string
  ): 'default' | 'secondary' | 'destructive' | 'outline' | 'pending' | 'warning' {
    if (!status) return 'outline'

    switch (status) {
      case 'pending':
        return 'pending'
      case 'active':
      case 'in_progress':
        return 'default'
      case 'completed':
        return 'secondary'
      case 'on_hold':
        return 'warning'
      case 'archived':
        return 'secondary'
      case 'cancelled':
        return 'destructive'
      default:
        return 'outline'
    }
  }
</script>

<svelte:head>
  <title>{pageTitle}</title>
</svelte:head>

<OrganizationLayout title={pageTitle}>
  <div class="min-w-0">
    <section class="bg-card border border-border rounded-2xl p-6 shadow-xs">


      <div class="mt-6 rounded-3xl border border-border bg-secondary/40 p-5 sm:p-6">
        <h1 class="text-3xl font-black tracking-tight text-foreground sm:text-4xl">{t('project.projects', {}, 'Projects')}</h1>
      </div>

      <div class="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div class="border border-border rounded-lg p-4 bg-card">
          <span class="block text-sm text-foreground/80">{t('project.total_projects', {}, 'Total projects')}</span>
          <strong class="mt-2 block text-2xl">{stats.total_projects}</strong>
        </div>
        <div class="border border-border rounded-lg p-4 bg-card">
          <span class="block text-sm text-foreground/80">{t('project.active_projects', {}, 'Running')}</span>
          <strong class="mt-2 block text-2xl">{stats.active_projects}</strong>
        </div>
        <div class="border border-border rounded-lg p-4 bg-card">
          <span class="block text-sm text-foreground/80">{t('project.unique_managers', {}, 'Managers')}</span>
          <strong class="mt-2 block text-2xl">{new Set(safeProjects.map((project) => project.manager_name).filter(Boolean)).size}</strong>
        </div>
        <div class="border border-border rounded-lg p-4 bg-card">
          <span class="block text-sm text-foreground/80">{t('project.completed_projects', {}, 'Completed')}</span>
          <strong class="mt-2 block text-2xl">{stats.completed_projects}</strong>
        </div>
      </div>

      <div class="mt-4">
        <DataTableFilters
          filters={filterConfig}
          values={filterValues}
          onFilterChange={handleFilterChange}
        >
          <Button type="button" variant="outline" onclick={handleClearFilters}>
            {t('project.clear_filters', {}, 'Clear filters')}
          </Button>
        </DataTableFilters>
      </div>

      <div class="mt-6 grid gap-3 lg:hidden">
        {#if safeProjects.length === 0}
          <div class="rounded-2xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
            {t('project.no_projects', {}, 'No projects available')}
          </div>
        {:else}
          {#each safeProjects as project (project.id)}
            <article class="rounded-2xl border border-border bg-card p-4">
              <div class="flex flex-col gap-3">
                <div class="min-w-0">
                  <h2 class="truncate text-base font-black text-foreground">{project.name}</h2>
                  <p class="mt-1 text-sm text-muted-foreground">{project.organization_name}</p>
                </div>
                <div class="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant={statusBadge(project.status)}>{statusLabel(project.status)}</Badge>
                  <span>{visibilityLabel(project.visibility)}</span>
                  <span>{project.manager_name ?? t('project.no_manager', {}, 'No manager yet')}</span>
                </div>
                <div class="grid gap-2 sm:grid-cols-2">
                  <Button class="w-full" variant="outline" size="sm" type="button" onclick={() => { handleViewProject(project.id); }}>
                    {t('project.view_project_detail', {}, 'View project detail')}
                  </Button>
                  <Button class="w-full" variant="outline" size="sm" type="button" onclick={() => { handleOpenProjectTasks(project.id); }}>
                    {t('project.open_project_tasks', {}, 'Open project tasks')}
                  </Button>
                </div>
              </div>
            </article>
          {/each}
        {/if}
      </div>

      <div class="mt-6 hidden overflow-hidden rounded-2xl border border-border bg-card lg:block">
        <div class="overflow-x-auto">
          <Table class="w-full table-fixed">
            <TableHeader class="bg-secondary/60">
              <TableRow class="hover:bg-transparent">
                <TableHead class="font-bold uppercase tracking-wider text-foreground/70">{t('project.name', {}, 'Project Name')}</TableHead>
                <TableHead class="hidden font-bold uppercase tracking-wider text-foreground/70 2xl:table-cell">{t('organization.organization', {}, 'Organization')}</TableHead>
                <TableHead class="hidden font-bold uppercase tracking-wider text-foreground/70 2xl:table-cell">{t('project.visibility', {}, 'Visibility')}</TableHead>
                <TableHead class="w-32 font-bold uppercase tracking-wider text-foreground/70">{t('common.status', {}, 'Status')}</TableHead>
                <TableHead class="hidden font-bold uppercase tracking-wider text-foreground/70 xl:table-cell">{t('project.manager', {}, 'Manager')}</TableHead>
                <TableHead class="hidden font-bold uppercase tracking-wider text-foreground/70 2xl:table-cell">{t('project.start_date', {}, 'Start Date')}</TableHead>
                <TableHead class="hidden font-bold uppercase tracking-wider text-foreground/70 2xl:table-cell">{t('project.end_date', {}, 'End Date')}</TableHead>
                <TableHead class="w-56 text-right font-bold uppercase tracking-wider text-foreground/70">{t('common.actions', {}, 'Actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {#if safeProjects.length === 0}
                <TableRow class="hover:bg-secondary/40">
                  <TableCell class="py-12 text-center text-muted-foreground" colspan={8}>
                    <div class="mx-auto max-w-md space-y-2">
                      <p class="font-semibold text-foreground">{t('project.no_projects', {}, 'No projects available')}</p>
                    </div>
                  </TableCell>
                </TableRow>
              {:else}
                {#each safeProjects as project (project.id)}
                  <TableRow class="hover:bg-secondary/40">
                    <TableCell class="truncate font-semibold text-foreground">{project.name}</TableCell>
                    <TableCell class="hidden truncate text-muted-foreground 2xl:table-cell">{project.organization_name}</TableCell>
                    <TableCell class="hidden text-muted-foreground 2xl:table-cell">
                      {visibilityLabel(project.visibility)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusBadge(project.status)}>{statusLabel(project.status)}</Badge>
                    </TableCell>
                    <TableCell class="hidden truncate text-muted-foreground xl:table-cell">{project.manager_name ?? '-'}</TableCell>
                    <TableCell class="hidden text-muted-foreground 2xl:table-cell">{project.start_date ? formatDate(project.start_date) : '-'}</TableCell>
                    <TableCell class="hidden text-muted-foreground 2xl:table-cell">{project.end_date ? formatDate(project.end_date) : '-'}</TableCell>
                    <TableCell>
                      <div class="grid justify-end gap-2">
                        <Button class="w-full" variant="outline" size="sm" type="button" onclick={() => { handleViewProject(project.id); }}>
                          {t('project.view_project_detail', {}, 'View project detail')}
                        </Button>
                        <Button class="w-full" variant="outline" size="sm" type="button" onclick={() => { handleOpenProjectTasks(project.id); }}>
                          {t('project.open_project_tasks', {}, 'Open project tasks')}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                {/each}
              {/if}
            </TableBody>
          </Table>
        </div>
      </div>

      {#if true}
        <div class="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
          <UnifiedOffsetPagination
            pagination={projectPagination}
            baseUrl={FRONTEND_ROUTES.ORG_PROJECTS}
            queryParams={{
              search: filters.search || undefined,
              status: filters.status || undefined,
              creator_id: filters.creator_id || undefined,
              manager_id: filters.manager_id || undefined,
              visibility: filters.visibility || undefined,
              sort_by: filters.sort_by || undefined,
              sort_order: filters.sort_order || undefined,
            }}
          />
        </div>
      {/if}
    </section>
  </div>

  <Dialog open={showOrganizationModal}>
    <DialogContent class="sm:max-w-[500px]">
      <DialogHeader>
        <DialogTitle class="flex items-center gap-2">
          <Building class="h-5 w-5" />
          <span>{t('organization.required', {}, 'Organization required')}</span>
        </DialogTitle>
        <DialogDescription>
          {t('organization.required_message', {}, 'Join or create an organization to manage projects.')}
        </DialogDescription>
      </DialogHeader>

      <div class="py-4">
        <p class="text-sm text-muted-foreground mb-4">
          {t('organization.project_scope_message', {}, 'Select or join an organization before creating projects.')}
        </p>
      </div>

      <DialogFooter>
        <Button variant="outline" onclick={() => { showOrganizationModal = false }}>
          {t('common.cancel', {}, 'Cancel')}
        </Button>
        <Button onclick={handleGoToOrganizations}>
          {t('organization.go_to_organizations', {}, 'Go to organizations')}
          <ArrowRight class="ml-2 h-4 w-4" />
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>

  <ProjectDetailModal
    bind:open={detailModalOpen}
    projectId={selectedProjectId}
    onOpenChange={(open: boolean) => {
      detailModalOpen = open
      if (!open) {
        selectedProjectId = undefined
      }
    }}
    onDeleted={handleProjectDeleted}
  />
</OrganizationLayout>
