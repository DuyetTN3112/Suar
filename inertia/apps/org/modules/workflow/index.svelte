<script lang="ts">
  import { router } from '@inertiajs/svelte'
  import axios from 'axios'

  import OrganizationLayout from '@/apps/org/shared/layouts/organization_layout.svelte'
  import Button from '@/apps/org/shared/ui/button.svelte'
  import Input from '@/apps/org/shared/ui/input.svelte'

  interface TaskStatus {
    id: string
    name: string
    color: string
    order: number
    is_default: boolean
  }

  interface Props {
    taskStatuses: TaskStatus[]
  }

  const { taskStatuses }: Props = $props()
  let localStatuses = $state<TaskStatus[]>([])
  let creating = $state(false)
  let mutatingStatusId = $state<string | null>(null)
  let newStatusName = $state('')
  let newStatusColor = $state('#6B7280')
  let hydratedSignature = $state('')

  const sortedStatuses = $derived([...localStatuses].sort((a, b) => a.order - b.order))
  const statusCountLabel = $derived(`${sortedStatuses.length} trạng thái`)

  $effect(() => {
    const signature = taskStatuses.map((status) => `${status.id}:${status.name}:${status.order}`).join('|')
    if (signature !== hydratedSignature) {
      hydratedSignature = signature
      localStatuses = [...taskStatuses].sort((a, b) => a.order - b.order)
    }
  })

  function slugifyStatusName(raw: string): string {
    return raw
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s_]/g, '')
      .trim()
      .replace(/\s+/g, '_')
      .replace(/_+/g, '_')
      .slice(0, 50)
  }

  function reloadWorkflow() {
    router.reload({ only: ['taskStatuses', 'flash'] })
  }

  async function createStatus() {
    const name = newStatusName.trim()
    if (!name) return

    creating = true
    try {
      await axios.post('/api/v1/task-statuses', {
        name,
        slug: slugifyStatusName(name),
        group: 'in_progress',
        color: newStatusColor,
        sortOrder: sortedStatuses.length + 1,
      })
      newStatusName = ''
      newStatusColor = '#6B7280'
      reloadWorkflow()
    } finally {
      creating = false
    }
  }

  async function renameStatus(status: TaskStatus) {
    const nextName = window.prompt('Tên trạng thái mới', status.name)?.trim()
    if (!nextName || nextName === status.name) return

    mutatingStatusId = status.id
    try {
      await axios.patch(`/api/v1/task-statuses/${status.id}`, {
        name: nextName,
        slug: slugifyStatusName(nextName),
      })
      localStatuses = localStatuses.map((item) =>
        item.id === status.id ? { ...item, name: nextName } : item
      )
      reloadWorkflow()
    } finally {
      mutatingStatusId = null
    }
  }

  async function moveStatus(status: TaskStatus, direction: -1 | 1) {
    const current = [...sortedStatuses]
    const from = current.findIndex((item) => item.id === status.id)
    const to = from + direction
    if (from < 0 || to < 0 || to >= current.length) return

    const source = current[from]
    const target = current[to]
    if (!source || !target) return

    mutatingStatusId = status.id
    current[from] = { ...target, order: source.order }
    current[to] = { ...source, order: target.order }
    localStatuses = current

    try {
      await Promise.all([
        axios.patch(`/api/v1/task-statuses/${source.id}`, { sortOrder: target.order }),
        axios.patch(`/api/v1/task-statuses/${target.id}`, { sortOrder: source.order }),
      ])
      reloadWorkflow()
    } finally {
      mutatingStatusId = null
    }
  }
</script>

<svelte:head>
  <title>Workflow task</title>
</svelte:head>

<OrganizationLayout title="Workflow task">
  <div class="space-y-6">
    <header class="flex flex-col gap-4 border-b border-border pb-5 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p class="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Điều phối task</p>
        <h1 class="mt-1 text-3xl font-black text-foreground">Workflow task</h1>
        <p class="mt-2 text-sm text-muted-foreground">Quản lý trạng thái và thứ tự cột task trong workspace tổ chức.</p>
      </div>
      <div class="rounded-md border border-border bg-background px-3 py-2 text-sm font-bold text-muted-foreground">
        {statusCountLabel}
      </div>
    </header>

    <section class="grid gap-3 rounded-lg border border-border bg-card p-4 md:grid-cols-[1fr_110px_auto]">
      <Input
        aria-label="Tên trạng thái mới"
        placeholder="Tên trạng thái mới"
        bind:value={newStatusName}
        disabled={creating}
      />
      <Input
        aria-label="Màu trạng thái mới"
        type="color"
        class="h-11 p-1"
        bind:value={newStatusColor}
        disabled={creating}
      />
      <Button onclick={() => { void createStatus() }} disabled={creating || !newStatusName.trim()}>
        {creating ? 'Đang thêm...' : 'Thêm trạng thái'}
      </Button>
    </section>

    <section class="rounded-lg border border-border bg-card">
      {#if sortedStatuses.length === 0}
        <p class="p-6 text-sm text-muted-foreground">Chua co trang thai task.</p>
      {:else}
        <div class="divide-y divide-border">
          {#each sortedStatuses as status (status.id)}
            <div class="flex items-center justify-between gap-4 p-4">
              <div class="flex min-w-0 items-center gap-3">
                <span class="h-3 w-3 rounded-full" style={`background-color: ${status.color}`}></span>
                <div class="min-w-0">
                  <p class="truncate font-bold text-foreground">{status.name}</p>
                  <p class="text-xs text-muted-foreground">Thu tu {status.order}</p>
                </div>
              </div>
              {#if status.is_default}
                <span class="rounded-full border border-border px-2.5 py-1 text-xs font-bold text-muted-foreground">
                  Mac dinh
                </span>
              {/if}
              <div class="flex shrink-0 flex-wrap items-center justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onclick={() => { void renameStatus(status) }}
                  disabled={mutatingStatusId === status.id}
                  aria-label={`Đổi tên ${status.name}`}
                >
                  Đổi tên
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onclick={() => { void moveStatus(status, -1) }}
                  disabled={mutatingStatusId === status.id || sortedStatuses[0]?.id === status.id}
                  aria-label={`Đưa ${status.name} lên trước`}
                >
                  Lên
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onclick={() => { void moveStatus(status, 1) }}
                  disabled={mutatingStatusId === status.id || sortedStatuses[sortedStatuses.length - 1]?.id === status.id}
                  aria-label={`Đưa ${status.name} xuống sau`}
                >
                  Xuống
                </Button>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </section>
  </div>
</OrganizationLayout>
