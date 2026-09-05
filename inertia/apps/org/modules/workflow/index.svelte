<script lang="ts">
  import { onMount } from 'svelte'

  import OrganizationLayout from '@/apps/org/shared/layouts/organization_layout.svelte'
  import {
    loadWorkflowConfiguration,
    replaceWorkflowTransitions,
    type WorkflowStatusDefinition,
    type WorkflowTransitionInput,
  } from '@/apps/org/modules/tasks/api/workflow_api'

  interface WorkflowPageProps {
    taskStatuses?: Array<{ id: string; name: string; color: string }>
  }

  let { taskStatuses = [] }: WorkflowPageProps = $props()

  let statuses = $state<WorkflowStatusDefinition[]>([])
  let transitions = $state<WorkflowTransitionInput[]>([])
  let isLoading = $state(true)
  let isSaving = $state(false)
  let errorMessage = $state<string | null>(null)
  let successMessage = $state<string | null>(null)
  let selectedFrom = $state('')
  let selectedTo = $state('')

  const statusById = (id: string) => statuses.find((status) => status.id === id)

  const edgeKey = (edge: WorkflowTransitionInput) => `${edge.fromStatusId}:${edge.toStatusId}`

  function addTransition() {
    errorMessage = null
    successMessage = null

    if (!selectedFrom || !selectedTo) {
      errorMessage = 'Chọn cả trạng thái bắt đầu và trạng thái đích.'
      return
    }
    if (selectedFrom === selectedTo) {
      errorMessage = 'Trạng thái bắt đầu và trạng thái đích phải khác nhau.'
      return
    }
    if (transitions.some((edge) => edge.fromStatusId === selectedFrom && edge.toStatusId === selectedTo)) {
      errorMessage = 'Transition này đã có trong workflow.'
      return
    }

    transitions = [...transitions, { fromStatusId: selectedFrom, toStatusId: selectedTo, conditions: {} }]
    selectedTo = ''
  }

  function removeTransition(key: string) {
    transitions = transitions.filter((edge) => edgeKey(edge) !== key)
    successMessage = null
  }

  async function saveWorkflow() {
    isSaving = true
    errorMessage = null
    successMessage = null

    try {
      await replaceWorkflowTransitions(transitions)
      successMessage = 'Đã lưu workflow cho tổ chức này.'
    } catch (error: unknown) {
      errorMessage =
        error instanceof Error
          ? error.message
          : 'Không thể lưu workflow. Vui lòng thử lại.'
    } finally {
      isSaving = false
    }
  }

  onMount(async () => {
    try {
      const configuration = await loadWorkflowConfiguration()
      statuses = configuration.statuses
      transitions = configuration.transitions
    } catch {
      statuses = taskStatuses.map((status) => ({ ...status, category: 'unknown' }))
      errorMessage = 'Không thể tải cấu hình workflow mới nhất. Vui lòng tải lại trang.'
    } finally {
      isLoading = false
    }
  })
</script>

<svelte:head>
  <title>Task workflow</title>
</svelte:head>

<OrganizationLayout title="Task workflow">
  <main class="mx-auto w-full max-w-5xl space-y-8 px-4 py-6 sm:px-6">
    <header class="max-w-3xl space-y-3">
      <h1 class="text-2xl font-bold tracking-tight text-foreground">Task workflow</h1>
      <p class="text-sm leading-6 text-muted-foreground">
        Define the allowed moves between your organization’s task statuses. This workflow applies
        only to the current organization; it is not a product-wide rule.
      </p>
      <p class="text-sm leading-6 text-muted-foreground">
        Need more columns or different categories? Manage task statuses from the task board, then
        return here to connect them.
      </p>
      <a class="inline-flex text-sm font-semibold text-primary underline-offset-4 hover:underline" href="/org/tasks/board">
        Manage task statuses on the board
      </a>
    </header>

    {#if errorMessage}
      <div class="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
        {errorMessage}
      </div>
    {/if}

    {#if successMessage}
      <div class="rounded-md border border-green-600/30 bg-green-600/10 px-4 py-3 text-sm text-green-800 dark:text-green-300" role="status">
        {successMessage}
      </div>
    {/if}

    <section class="border-y border-border py-6" aria-labelledby="add-transition-heading">
      <div class="mb-4">
        <h2 id="add-transition-heading" class="text-base font-semibold text-foreground">Add allowed transition</h2>
        <p class="mt-1 text-sm text-muted-foreground">For example: DONE_DEV → DONE for a direct QA approval flow.</p>
      </div>
      <div class="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label class="grid flex-1 gap-1.5 text-sm font-medium text-foreground">
          From
          <select bind:value={selectedFrom} class="h-10 rounded-md border border-input bg-background px-3 text-sm" disabled={isLoading}>
            <option value="">Choose a status</option>
            {#each statuses as status (status.id)}
              <option value={status.id}>{status.name}</option>
            {/each}
          </select>
        </label>
        <label class="grid flex-1 gap-1.5 text-sm font-medium text-foreground">
          To
          <select bind:value={selectedTo} class="h-10 rounded-md border border-input bg-background px-3 text-sm" disabled={isLoading}>
            <option value="">Choose a status</option>
            {#each statuses as status (status.id)}
              <option value={status.id}>{status.name}</option>
            {/each}
          </select>
        </label>
        <button type="button" class="h-10 rounded-md border border-input px-4 text-sm font-semibold text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50" onclick={addTransition} disabled={isLoading}>
          Add transition
        </button>
      </div>
    </section>

    <section aria-labelledby="transitions-heading">
      <div class="mb-3 flex items-center justify-between gap-4">
        <div>
          <h2 id="transitions-heading" class="text-base font-semibold text-foreground">Allowed transitions</h2>
          <p class="mt-1 text-sm text-muted-foreground">{transitions.length} transition{transitions.length === 1 ? '' : 's'} configured</p>
        </div>
        <button type="button" class="h-10 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50" onclick={saveWorkflow} disabled={isLoading || isSaving}>
          {isSaving ? 'Saving…' : 'Save workflow'}
        </button>
      </div>

      {#if isLoading}
        <div class="border border-border px-4 py-8 text-sm text-muted-foreground">Loading workflow…</div>
      {:else if transitions.length === 0}
        <div class="border border-dashed border-border px-4 py-8 text-sm leading-6 text-muted-foreground">
          No restrictions are configured yet. Until you add and save a transition graph, any status can move to any other status.
        </div>
      {:else}
        <ul class="divide-y divide-border border border-border" aria-label="Configured workflow transitions">
          {#each transitions as transition (edgeKey(transition))}
            <li class="flex items-center justify-between gap-4 px-4 py-3">
              <div class="flex min-w-0 items-center gap-2 text-sm text-foreground">
                <span class="truncate font-medium">{statusById(transition.fromStatusId)?.name ?? 'Deleted status'}</span>
                <span aria-hidden="true" class="text-muted-foreground">→</span>
                <span class="truncate font-medium">{statusById(transition.toStatusId)?.name ?? 'Deleted status'}</span>
              </div>
              <button type="button" class="shrink-0 text-sm font-semibold text-destructive underline-offset-4 hover:underline" onclick={() => removeTransition(edgeKey(transition))}>
                Remove
              </button>
            </li>
          {/each}
        </ul>
      {/if}
    </section>
  </main>
</OrganizationLayout>
