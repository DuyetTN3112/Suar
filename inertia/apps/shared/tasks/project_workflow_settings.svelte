<script lang="ts">
  import axios from 'axios'

  export interface Props {
    projectId: string
    canManage: boolean
  }

  interface Status {
    id: string
    name: string
    slug: string
    group: 'docs' | 'todo' | 'in_progress' | 'done' | 'cancelled'
    color: string
    isSystem?: boolean
  }

  interface Transition {
    fromStatusId: string
    toStatusId: string
    conditions: Record<string, unknown>
  }

  const { projectId, canManage }: Props = $props()
  const categories = [
    { value: 'docs', label: 'Tài liệu — thông tin dùng chung' },
    { value: 'todo', label: 'Chưa bắt đầu' },
    { value: 'in_progress', label: 'Đang thực hiện' },
    { value: 'done', label: 'Hoàn tất' },
    { value: 'cancelled', label: 'Đã hủy / từ chối' },
  ] as const
  const documentationStatusSlug = 'docs'

  let statuses = $state<Status[]>([])
  let savedStatuses = $state<Record<string, Pick<Status, 'name' | 'group' | 'color'>>>({})
  let transitions = $state<Transition[]>([])
  let loading = $state(true)
  let saving = $state(false)
  let error = $state('')
  let newStatusName = $state('')
  let newStatusCategory = $state<Status['group']>('in_progress')
  let activeTab = $state<'statuses' | 'transitions'>('statuses')
  let selectedFromStatusId = $state('')

  const transitionKey = (fromStatusId: string, toStatusId: string) => `${fromStatusId}:${toStatusId}`
  const isDocumentationStatus = (status: Status) =>
    status.group === 'docs' || status.slug === documentationStatusSlug
  const workflowStatuses = $derived(statuses)
  const workflowStatusIds = $derived(new Set(workflowStatuses.map((status) => status.id)))
  const workflowRoleLabel = (status: Status) =>
    isDocumentationStatus(status)
      ? 'Docs — thông tin dùng chung'
      : (categories.find((category) => category.value === status.group)?.label ?? 'Chưa xác định')
  const transitionByKey = $derived(new Map(transitions.map((transition) => [transitionKey(transition.fromStatusId, transition.toStatusId), transition])))
  const changedStatuses = $derived(statuses.filter((status) => {
    const saved = savedStatuses[status.id]
    return !saved || saved.name !== status.name || saved.group !== status.group || saved.color !== status.color
  }))
  const hasStatusChanges = $derived(changedStatuses.length > 0)

  function slugify(name: string) {
    return name.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/(^_|_$)/g, '')
  }

  async function load() {
    loading = true
    error = ''
    try {
      const [statusResponse, workflowResponse] = await Promise.all([
        axios.get<{ data?: Status[] }>('/api/v1/task-statuses', { params: { project_id: projectId } }),
        axios.get<{ data?: Transition[] }>('/api/v1/workflow', { params: { project_id: projectId } }),
      ])
      statuses = statusResponse.data.data ?? []
      savedStatuses = Object.fromEntries(statuses.map((status) => [status.id, {
        name: status.name,
        group: status.group,
        color: status.color,
      }]))
      transitions = workflowResponse.data.data ?? []
      if (!workflowStatuses.some((status) => status.id === selectedFromStatusId)) {
        selectedFromStatusId = workflowStatuses[0]?.id ?? ''
      }
    } catch {
      error = 'Không thể tải cấu hình workflow của project.'
    } finally {
      loading = false
    }
  }

  $effect(() => { void load() })

  async function createStatus() {
    const name = newStatusName.trim()
    const slug = slugify(name)
    if (!name || !slug) {
      error = 'Nhập tên status hợp lệ trước khi thêm.'
      return
    }
    saving = true
    error = ''
    try {
      await axios.post('/api/v1/task-statuses', {
        project_id: projectId, name, slug, group: newStatusCategory,
        color: '#64748B', sortOrder: statuses.length,
      })
      newStatusName = ''
      await load()
    } catch {
      error = 'Không thể thêm status. Tên hoặc slug có thể đã tồn tại.'
    } finally { saving = false }
  }

  async function saveStatuses() {
    if (!hasStatusChanges) return
    saving = true
    error = ''
    try {
      await Promise.all(changedStatuses.map((status) => axios.patch(`/api/v1/task-statuses/${status.id}`, {
        project_id: projectId, name: status.name.trim(), slug: slugify(status.name),
        group: status.group, color: status.color,
      })))
      await load()
    } catch {
      error = 'Không thể lưu các thay đổi status.'
    } finally { saving = false }
  }

  async function deleteStatus(status: Status) {
    if (!confirm(`Xóa status “${status.name}”? Task đang dùng status này phải được chuyển trước.`)) return
    saving = true
    error = ''
    try {
      await axios.delete(`/api/v1/task-statuses/${status.id}`, { params: { project_id: projectId } })
      await load()
    } catch {
      error = 'Không thể xóa status đang là system status hoặc còn task sử dụng.'
    } finally { saving = false }
  }

  function toggleTransition(fromStatusId: string, toStatusId: string) {
    const key = transitionKey(fromStatusId, toStatusId)
    const existing = transitionByKey.get(key)
    transitions = existing
      ? transitions.filter((transition) => transitionKey(transition.fromStatusId, transition.toStatusId) !== key)
      : [...transitions, { fromStatusId, toStatusId, conditions: {} }]
  }

  function setRequiresAssignee(fromStatusId: string, toStatusId: string, required: boolean) {
    const key = transitionKey(fromStatusId, toStatusId)
    transitions = transitions.map((transition) =>
      transitionKey(transition.fromStatusId, transition.toStatusId) === key
        ? { ...transition, conditions: { ...transition.conditions, requires_assignee: required } }
        : transition
    )
  }

  const selectedFromStatus = $derived(
    workflowStatuses.find((status) => status.id === selectedFromStatusId) ?? null
  )
  const allowedTransitionTargets = $derived(
    selectedFromStatus
      ? workflowStatuses.filter(
          (status) =>
            status.id !== selectedFromStatus.id &&
            isDocumentationStatus(status) === isDocumentationStatus(selectedFromStatus)
        )
      : []
  )

  async function saveTransitions() {
    saving = true
    error = ''
    try {
      await axios.put('/api/v1/workflow', {
        project_id: projectId,
        transitions: transitions.filter((transition) => {
          if (!workflowStatusIds.has(transition.fromStatusId) || !workflowStatusIds.has(transition.toStatusId)) return false
          const fromStatus = statuses.find((status) => status.id === transition.fromStatusId)
          const toStatus = statuses.find((status) => status.id === transition.toStatusId)
          return Boolean(fromStatus && toStatus && isDocumentationStatus(fromStatus) === isDocumentationStatus(toStatus))
        }),
      })
      await load()
    } catch {
      error = 'Không thể lưu các transition của workflow.'
    } finally { saving = false }
  }
</script>

<section class="space-y-8" aria-label="Task workflow settings">
  <div class="flex w-fit rounded-lg border border-border bg-muted/40 p-1" role="tablist" aria-label="Workflow settings">
    <button
      class="rounded-md px-4 py-2 text-sm font-semibold transition-colors {activeTab === 'statuses' ? 'bg-background text-foreground shadow-suar-xs' : 'text-muted-foreground hover:text-foreground'}"
      role="tab"
      aria-selected={activeTab === 'statuses'}
      onclick={() => { activeTab = 'statuses' }}
    >Status</button>
    <button
      class="rounded-md px-4 py-2 text-sm font-semibold transition-colors {activeTab === 'transitions' ? 'bg-background text-foreground shadow-suar-xs' : 'text-muted-foreground hover:text-foreground'}"
      role="tab"
      aria-selected={activeTab === 'transitions'}
      onclick={() => { activeTab = 'transitions' }}
    >Chuyển trạng thái</button>
  </div>

  {#if error}<div class="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">{error}</div>{/if}

  {#if loading}
    <div class="space-y-3" aria-busy="true"><div class="h-12 animate-pulse rounded-lg bg-muted"></div><div class="h-36 animate-pulse rounded-lg bg-muted"></div></div>
  {:else}
    {#if activeTab === 'statuses'}
    <section class="space-y-4" role="tabpanel">
      <div class="flex flex-wrap items-center justify-between gap-3"><h2 class="text-lg font-bold">Status</h2>{#if canManage && hasStatusChanges}<button class="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50" onclick={() => void saveStatuses()} disabled={saving}>Lưu thay đổi</button>{/if}</div>
      <div class="overflow-x-auto rounded-xl border border-border">
        <table class="w-full min-w-[720px] text-sm"><thead class="bg-muted/60 text-left text-xs font-semibold text-muted-foreground"><tr><th class="px-4 py-3">Tên status</th><th class="px-4 py-3">Vai trò trong quy trình</th><th class="px-4 py-3">Màu</th><th class="px-4 py-3 text-right">Thao tác</th></tr></thead>
          <tbody class="divide-y divide-border">{#each statuses as status (status.id)}<tr>
            <td class="px-4 py-3"><input class="h-9 w-full rounded-md border border-input bg-background px-2" bind:value={status.name} disabled={!canManage || saving} /></td>
            <td class="px-4 py-3">{#if status.isSystem}<span class="inline-flex h-9 items-center rounded-md bg-muted px-3 text-sm text-muted-foreground">{workflowRoleLabel(status)}</span>{:else}<select class="h-9 rounded-md border border-input bg-background px-2 text-foreground" bind:value={status.group} disabled={!canManage || saving} aria-label={`Vai trò của ${status.name}`}>{#each categories as category}<option value={category.value}>{category.label}</option>{/each}</select>{/if}</td>
            <td class="px-4 py-3"><input class="h-9 w-12 rounded border border-input bg-background p-1" type="color" bind:value={status.color} disabled={!canManage || saving} /></td>
            <td class="px-4 py-3 text-right">{#if !status.isSystem}<button class="rounded-md px-3 py-2 font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-50" onclick={() => void deleteStatus(status)} disabled={!canManage || saving}>Xóa</button>{/if}</td>
          </tr>{/each}</tbody>
        </table>
      </div>
      {#if canManage}<div class="space-y-2 rounded-xl border border-dashed border-border p-4"><div class="flex flex-col gap-2 sm:flex-row"><input class="h-10 flex-1 rounded-md border border-input bg-background px-3 text-foreground" placeholder="Ví dụ: Chờ QA hoặc API" bind:value={newStatusName} disabled={saving} /><select class="h-10 rounded-md border border-input bg-background px-3 text-foreground" bind:value={newStatusCategory} disabled={saving}>{#each categories as category}<option value={category.value}>{category.label}</option>{/each}</select><button class="h-10 rounded-md bg-primary px-4 font-semibold text-primary-foreground disabled:opacity-50" onclick={() => void createStatus()} disabled={saving}>Thêm status</button></div><p class="text-xs leading-5 text-muted-foreground">Nhóm Docs có thể có nhiều cột, ví dụ API hoặc kiến trúc. Các cột Docs chỉ chuyển qua lại với nhau; không giao người, không review và không đưa vào hồ sơ năng lực.</p></div>{/if}
    </section>
    {:else}

    <section class="space-y-4" role="tabpanel">
      <div class="flex flex-wrap items-center justify-between gap-3"><h2 class="text-lg font-bold">Chuyển trạng thái</h2>{#if canManage}<button class="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50" onclick={() => void saveTransitions()} disabled={saving}>Lưu thay đổi</button>{/if}</div>
      <div class="max-w-md"><label class="mb-2 block text-sm font-semibold" for="workflow-from-status">Từ trạng thái</label><select id="workflow-from-status" class="h-10 w-full rounded-md border border-input bg-background px-3 text-foreground" bind:value={selectedFromStatusId}>{#each workflowStatuses as status (status.id)}<option value={status.id}>{status.name}</option>{/each}</select></div>
      {#if selectedFromStatus}<section class="space-y-3"><h3 class="text-sm font-semibold">Có thể chuyển sang</h3>{#if isDocumentationStatus(selectedFromStatus)}<p class="text-xs text-muted-foreground">Cột Docs chỉ chuyển qua lại với các cột Docs khác.</p>{/if}<div class="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{#each allowedTransitionTargets as toStatus (toStatus.id)}{@const transition = transitionByKey.get(transitionKey(selectedFromStatus.id, toStatus.id))}<label class="flex min-h-12 items-center gap-2 rounded-md border px-3 text-sm {transition ? 'border-primary/40 bg-primary/5' : 'border-border'}"><input type="checkbox" checked={Boolean(transition)} onchange={() => toggleTransition(selectedFromStatus.id, toStatus.id)} disabled={!canManage || saving} /><span class="min-w-0 flex-1 truncate">{toStatus.name}</span>{#if transition && !isDocumentationStatus(selectedFromStatus)}<span class="flex items-center gap-1 text-xs font-medium text-muted-foreground"><input type="checkbox" checked={transition.conditions.requires_assignee === true} onchange={(event) => setRequiresAssignee(selectedFromStatus.id, toStatus.id, event.currentTarget.checked)} disabled={!canManage || saving} />Bắt buộc có người thực hiện</span>{/if}</label>{/each}</div></section>{/if}
    </section>
    {/if}
  {/if}
</section>
