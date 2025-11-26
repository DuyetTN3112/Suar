<script lang="ts">
  import { Building2, FolderKanban } from 'lucide-svelte'
  import UnifiedOffsetPagination from '@/apps/org/shared/ui/unified_offset_pagination.svelte'
  import { buildOffsetPagination, paginateOffsetItems } from '@/apps/org/shared/lib/pagination'
  import { useTranslation } from '@/apps/org/shared/stores/translation.svelte'

  interface OrgMembershipItem {
    org_name: string
    org_role: string
    joined_at: string
    status: string
  }

  interface ProjectMembershipItem {
    project_name: string
    org_name: string | null
    project_role: string
    start_date: string | null
    end_date: string | null
    visibility: string
  }

  interface Props {
    workHistory: {
      organizations: OrgMembershipItem[]
      projects: ProjectMembershipItem[]
    }
  }

  const { workHistory }: Props = $props()
  const { t } = useTranslation()

  function roleLabel(role: string): string {
    const map: Record<string, string> = {
      org_owner: 'Owner',
      org_admin: 'Admin',
      org_member: 'Member',
      project_manager: 'Manager',
      project_lead: 'Lead',
      project_member: 'Member',
      project_contributor: 'Contributor',
    }
    return t(`user.profile_work_history.roles.${role}`, {}, map[role] ?? role)
  }

  function roleBadgeClass(role: string): string {
    if (role.includes('owner') || role.includes('admin') || role.includes('manager')) {
      return 'border-border bg-accent text-foreground'
    }
    return 'border-border bg-card text-muted-foreground'
  }

  function statusBadge(item: OrgMembershipItem): string {
    return item.status === 'approved'
      ? 'border-primary/20 bg-primary/10 text-foreground'
      : 'border-border bg-secondary text-muted-foreground'
  }

  function formatDateRange(start: string | null, end: string | null): string {
    if (!start) return t('user.profile_work_history.date_unknown', {}, 'Unknown')
    return end ? `${start} -> ${end}` : `${start} -> ${t('user.profile_work_history.present', {}, 'Present')}`
  }

  let orgPage = $state(1)
  let projPage = $state(1)
  const itemsPerPage = 4

  const orgPagination = $derived(buildOffsetPagination({
    total: workHistory.organizations.length,
    perPage: itemsPerPage,
    page: orgPage,
  }))
  const paginatedOrgs = $derived(paginateOffsetItems(workHistory.organizations, orgPagination))

  const projPagination = $derived(buildOffsetPagination({
    total: workHistory.projects.length,
    perPage: itemsPerPage,
    page: projPage,
  }))
  const paginatedProjects = $derived(paginateOffsetItems(workHistory.projects, projPagination))
</script>

<section class="space-y-6">
  <div>
    <div class="mb-3 flex items-center gap-2">
      <Building2 class="size-4 text-muted-foreground" />
      <h2 class="text-sm font-black uppercase tracking-[0.18em] text-foreground">
        {t('user.profile_work_history.organizations_count', { count: workHistory.organizations.length }, 'Organizations (:count)')}
      </h2>
    </div>

    {#if workHistory.organizations.length === 0}
      <p class="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
        {t('user.profile_work_history.empty_organizations', {}, 'No organizations yet.')}
      </p>
    {:else}
      <div class="grid gap-3 sm:grid-cols-2">
        {#each paginatedOrgs as org, index (`${org.org_name}-${org.joined_at}-${org.org_role}-${index}`)}
          <div class="rounded-2xl border border-border bg-card p-4 shadow-suar-xs">
            <div class="flex items-start justify-between gap-2">
              <div class="flex items-center gap-2">
                <div class="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background">
                  <Building2 class="size-4 text-muted-foreground" />
                </div>
                <div>
                  <p class="text-sm font-bold text-foreground">{org.org_name}</p>
                  <p class="text-[11px] text-muted-foreground">{org.joined_at}</p>
                </div>
              </div>
              <span class="rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide {statusBadge(org)}">
                {org.status}
              </span>
            </div>
            <div class="mt-3">
              <span class="rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide {roleBadgeClass(org.org_role)}">
                {roleLabel(org.org_role)}
              </span>
            </div>
          </div>
        {/each}
      </div>
      {#if orgPagination.lastPage > 1}
        <UnifiedOffsetPagination 
          pagination={orgPagination} 
          onPageChange={(page: number) => orgPage = page} 
          class="mt-4 border-t pt-4"
        />
      {/if}
    {/if}
  </div>

  <div>
    <div class="mb-3 flex items-center gap-2">
      <FolderKanban class="size-4 text-muted-foreground" />
      <h2 class="text-sm font-black uppercase tracking-[0.18em] text-foreground">
        {t('user.profile_work_history.projects_count', { count: workHistory.projects.length }, 'Projects (:count)')}
      </h2>
    </div>

    {#if workHistory.projects.length === 0}
      <p class="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
        {t('user.profile_work_history.empty_projects', {}, 'No projects yet.')}
      </p>
    {:else}
      <div class="grid gap-3 sm:grid-cols-2">
        {#each paginatedProjects as proj, index (`${proj.project_name}-${proj.start_date ?? ''}-${proj.project_role}-${index}`)}
          <div class="rounded-2xl border border-border bg-card p-4 shadow-suar-xs">
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-bold text-foreground">{proj.project_name}</p>
                {#if proj.org_name}
                  <p class="truncate text-[11px] text-muted-foreground">{proj.org_name}</p>
                {/if}
              </div>
              <span class="shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide {roleBadgeClass(proj.project_role)}">
                {roleLabel(proj.project_role)}
              </span>
            </div>
            <p class="mt-2 text-[11px] font-semibold text-muted-foreground">
              {formatDateRange(proj.start_date, proj.end_date)}
            </p>
          </div>
        {/each}
      </div>
      {#if projPagination.lastPage > 1}
        <UnifiedOffsetPagination 
          pagination={projPagination} 
          onPageChange={(page: number) => projPage = page} 
          class="mt-4 border-t pt-4"
        />
      {/if}
    {/if}
  </div>
</section>
