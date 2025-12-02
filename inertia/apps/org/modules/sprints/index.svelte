<script lang="ts">
  import { FRONTEND_ROUTES } from '@/apps/org/shared/constants'
  import OrganizationLayout from '@/apps/org/shared/layouts/organization_layout.svelte'
  import type { OffsetPagePagination } from '@/apps/org/shared/lib/pagination'
  import UnifiedOffsetPagination from '@/apps/org/shared/ui/unified_offset_pagination.svelte'

  interface SprintProject {
    id: string
    name: string
    description: string | null
    status: string
    created_at: string
    _count: {
      members: number
      tasks: number
    }
  }

  interface Props {
    projects: SprintProject[]
    selectedProjectId?: string | null
    pagination: OffsetPagePagination
    filters?: {
      search?: string
      status?: string
    }
  }

  const { projects, selectedProjectId = null, pagination, filters = {} }: Props = $props()

  const selectedProject = $derived.by(() => {
    return projects.find((project) => project.id === selectedProjectId) ?? projects[0] ?? null
  })

  function projectHref(projectId: string): string {
    return `${FRONTEND_ROUTES.ORG_PROJECTS}/${encodeURIComponent(projectId)}?focus=sprints`
  }

  function statusLabel(status: string): string {
    if (status === 'active') return 'Đang chạy'
    if (status === 'completed') return 'Hoàn thành'
    if (status === 'cancelled') return 'Đã hủy'
    if (status === 'pending') return 'Đang chuẩn bị'
    return status || 'Không rõ'
  }
</script>

<svelte:head>
  <title>Điều phối sprint</title>
</svelte:head>

<OrganizationLayout title="Điều phối sprint">
  <div class="space-y-5 p-4 sm:p-6">
    <section class="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p class="text-xs font-black uppercase tracking-[0.16em] text-muted-foreground">Quản lý sprint</p>
        <h1 class="mt-1 text-3xl font-black tracking-tight text-foreground">Điều phối sprint</h1>
      </div>
      <a
        class="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-background px-3 text-sm font-extrabold text-foreground transition-colors hover:bg-secondary"
        href={FRONTEND_ROUTES.ORG_PROJECTS}
      >
        Projects
      </a>
    </section>

    {#if projects.length === 0}
      <section class="rounded-lg border border-dashed border-border bg-background px-5 py-10 text-center">
        <h2 class="text-lg font-black text-foreground">Chưa có project để quản lý sprint.</h2>
        <a
          class="mt-4 inline-flex h-9 items-center justify-center rounded-lg border border-border bg-background px-3 text-sm font-extrabold text-foreground transition-colors hover:bg-secondary"
          href={FRONTEND_ROUTES.ORG_PROJECTS}
        >
          Projects
        </a>
      </section>
    {:else}
      <div class="grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)] xl:items-start">
        <aside class="flex flex-col gap-3 xl:sticky xl:top-24 xl:max-h-[calc(100vh-7rem)]" aria-label="Projects">
          <h2 class="text-base font-black text-foreground shrink-0">Projects</h2>

          <div class="grid gap-2 overflow-y-auto custom-scrollbar xl:pr-2 min-h-0">
            {#each projects as project (project.id)}
              <a
                class={`block overflow-hidden rounded-lg border px-3 py-2.5 transition-colors ${
                  selectedProject?.id === project.id
                    ? 'border-amber-500/40 bg-amber-500/10 text-foreground'
                    : 'border-border bg-background text-foreground hover:bg-secondary'
                }`}
                href={projectHref(project.id)}
                aria-current={selectedProject?.id === project.id ? 'page' : undefined}
              >
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0 flex-1">
                    <div class="truncate text-sm font-black">{project.name}</div>
                  </div>
                  <div class="shrink-0 rounded-md border border-border bg-card px-2 py-0.5 text-[11px] font-black text-muted-foreground">
                    {project._count.tasks} task
                  </div>
                </div>
                <div class="mt-1.5 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                  <span>{statusLabel(project.status)}</span>
                  <span aria-hidden="true">·</span>
                  <span>{project._count.members} người</span>
                </div>
              </a>
            {/each}
          </div>

          <div class="shrink-0">
            <UnifiedOffsetPagination
              {pagination}
              baseUrl={FRONTEND_ROUTES.ORG_SPRINTS}
              queryParams={{
                search: filters.search || undefined,
                status: filters.status || undefined,
              }}
            />
          </div>
        </aside>

        <main class="min-w-0 space-y-4">
          {#if selectedProject}
            <section class="flex flex-col gap-2 rounded-lg border border-border bg-background p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 class="text-xl font-black text-foreground">{selectedProject.name}</h2>
                <div class="mt-1 flex flex-wrap items-center gap-2 text-xs font-bold text-muted-foreground">
                  <span>{statusLabel(selectedProject.status)}</span>
                  <span aria-hidden="true">·</span>
                  <span>{selectedProject._count.tasks} task</span>
                  <span aria-hidden="true">·</span>
                  <span>{selectedProject._count.members} người</span>
                </div>
              </div>
              <a
                class="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-background px-3 text-sm font-extrabold text-foreground transition-colors hover:bg-secondary"
                href={projectHref(selectedProject.id)}
              >
                Mở sprint project
              </a>
            </section>
          {/if}
        </main>
      </div>
    {/if}
  </div>
</OrganizationLayout>
