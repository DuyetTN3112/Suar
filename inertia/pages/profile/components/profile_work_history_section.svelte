<script lang="ts">
  import { Building2, FolderKanban } from 'lucide-svelte'

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

  function roleLabel(role: string): string {
    const map: Record<string, string> = {
      org_owner: 'Sở hữu',
      org_admin: 'Quản trị',
      org_member: 'Thành viên',
      project_manager: 'Quản lý',
      project_lead: 'Lead',
      project_member: 'Thành viên',
      project_contributor: 'Đóng góp',
    }
    return map[role] ?? role
  }

  function roleBadgeClass(role: string): string {
    if (role.includes('owner') || role.includes('admin') || role.includes('manager')) {
      return 'border-black bg-accent text-foreground'
    }
    return 'border-border bg-white text-muted-foreground'
  }

  function statusBadge(item: OrgMembershipItem): string {
    return item.status === 'approved'
      ? 'border-green-600 bg-green-50 text-green-700'
      : 'border-yellow-600 bg-yellow-50 text-yellow-700'
  }

  function formatDateRange(start: string | null, end: string | null): string {
    if (!start) return 'Chưa xác định'
    return end ? `${start} → ${end}` : `${start} → Hiện tại`
  }
</script>

<section class="space-y-6">
  <div>
    <div class="mb-3 flex items-center gap-2">
      <Building2 class="size-4 text-muted-foreground" />
      <h2 class="text-sm font-black uppercase tracking-[0.18em] text-foreground">
        Tổ chức ({workHistory.organizations.length})
      </h2>
    </div>

    {#if workHistory.organizations.length === 0}
      <p class="rounded-2xl border border-border bg-white p-4 text-sm text-muted-foreground">
        Chưa có tổ chức nào.
      </p>
    {:else}
      <div class="grid gap-3 sm:grid-cols-2">
        {#each workHistory.organizations as org (org.org_name + org.joined_at)}
          <div class="rounded-2xl border border-border bg-white p-4 shadow-suar-xs">
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
    {/if}
  </div>

  <div>
    <div class="mb-3 flex items-center gap-2">
      <FolderKanban class="size-4 text-muted-foreground" />
      <h2 class="text-sm font-black uppercase tracking-[0.18em] text-foreground">
        Dự án ({workHistory.projects.length})
      </h2>
    </div>

    {#if workHistory.projects.length === 0}
      <p class="rounded-2xl border border-border bg-white p-4 text-sm text-muted-foreground">
        Chưa có dự án nào.
      </p>
    {:else}
      <div class="grid gap-3 sm:grid-cols-2">
        {#each workHistory.projects as proj (proj.project_name + (proj.start_date ?? ''))}
          <div class="rounded-2xl border border-border bg-white p-4 shadow-suar-xs">
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
    {/if}
  </div>
</section>
