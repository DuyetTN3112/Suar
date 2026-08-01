<script lang="ts">
  import AppLayout from '@/apps/user/shared/layouts/app_layout.svelte'
  import type { TaskDetail } from '@/apps/user/modules/tasks/types/index.svelte'
  import { formatDate } from '@/apps/user/modules/tasks/utils/task_formatter.svelte'

  interface Props {
    tasks: {
      data: TaskDetail[]
      meta: {
        total: number
        per_page: number
        current_page: number
        last_page: number
      }
    }
    filters?: {
      page?: number
      limit?: number
      status?: string
      priority?: string
    }
  }

  const { tasks, filters = {} }: Props = $props()
  const pageTitle = 'My work'

  function taskHref(task: TaskDetail): string {
    return `/projects/${encodeURIComponent(task.project_id)}/tasks?task_id=${encodeURIComponent(task.id)}`
  }

  function submissionHref(task: TaskDetail): string {
    return taskHref(task)
  }

  function pageHref(page: number): string {
    const params = new URLSearchParams()
    params.set('page', String(page))
    params.set('limit', String(filters.limit ?? tasks.meta.per_page ?? 10))
    if (filters.status) params.set('status', filters.status)
    if (filters.priority) params.set('priority', filters.priority)
    return `/work?${params.toString()}`
  }
</script>

<svelte:head>
  <title>{pageTitle}</title>
</svelte:head>

<AppLayout title={pageTitle}>
  <main class="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-6 sm:px-6 lg:px-8">
    <header class="flex flex-col gap-2 border-b border-border pb-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p class="suar-meta">Assigned work</p>
        <h1 class="text-2xl font-semibold text-foreground">{pageTitle}</h1>
      </div>
      <p class="text-sm text-muted-foreground">{tasks.meta.total} active assignment{tasks.meta.total === 1 ? '' : 's'}</p>
    </header>

    {#if tasks.data.length === 0}
      <section class="rounded-lg border border-dashed border-border bg-card px-6 py-12 text-center">
        <h2 class="text-base font-semibold text-foreground">No active work</h2>
        <p class="mt-2 text-sm text-muted-foreground">Approved marketplace assignments and assigned tasks will appear here.</p>
      </section>
    {:else}
      <section class="overflow-hidden rounded-lg border border-border bg-card">
        <ul class="divide-y divide-border">
          {#each tasks.data as task (task.id)}
            <li class="grid gap-4 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <a class="truncate text-base font-semibold text-foreground hover:underline" href={taskHref(task)}>
                    {task.title}
                  </a>
                  <span class="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">{task.priority}</span>
                </div>
                <p class="mt-1 text-sm text-muted-foreground">
                  {task.organization?.name ?? 'External organization'}
                  {#if task.project?.name}
                    &middot; {task.project.name}
                  {/if}
                  {#if task.due_date}
                    &middot; Due {formatDate(task.due_date)}
                  {/if}
                </p>
              </div>
              <div class="flex shrink-0 gap-2">
                <a class="inline-flex h-9 items-center rounded-md border border-border px-3 text-sm font-medium text-foreground hover:bg-muted" href={taskHref(task)}>
                  Open
                </a>
                <a class="inline-flex h-9 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90" href={submissionHref(task)}>
                  Submit work
                </a>
              </div>
            </li>
          {/each}
        </ul>
      </section>
    {/if}

    {#if tasks.meta.last_page > 1}
      <nav class="flex items-center justify-end gap-2" aria-label="Pagination">
        {#if tasks.meta.current_page > 1}
          <a class="rounded-md border border-border px-3 py-2 text-sm hover:bg-muted" href={pageHref(tasks.meta.current_page - 1)}>Previous</a>
        {/if}
        <span class="text-sm text-muted-foreground">Page {tasks.meta.current_page} of {tasks.meta.last_page}</span>
        {#if tasks.meta.current_page < tasks.meta.last_page}
          <a class="rounded-md border border-border px-3 py-2 text-sm hover:bg-muted" href={pageHref(tasks.meta.current_page + 1)}>Next</a>
        {/if}
      </nav>
    {/if}
  </main>
</AppLayout>
