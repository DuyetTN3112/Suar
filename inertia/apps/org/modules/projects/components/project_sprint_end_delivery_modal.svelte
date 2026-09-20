<script lang="ts">
  import Button from '@/apps/org/shared/ui/button.svelte'
  import { useTranslation } from '@/apps/org/shared/stores/translation.svelte'
  import type { ProjectSprint, SprintBoard, SprintBoardTask } from '@/apps/shared/projects/project_sprint_types'

  interface Props {
    endingSprintId: string | null
    sprints: ProjectSprint[]
    board: SprintBoard | null
    endDestinations: Record<string, string>
    endDeliveryError: string | null
    incompleteTasks: SprintBoardTask[]
    onDestinationChange: (taskId: string, destination: string) => void
    onConfirm: () => void
    onCancel: () => void
  }

  const {
    endingSprintId = $bindable(null),
    sprints,
    board,
    endDestinations,
    endDeliveryError,
    incompleteTasks,
    onDestinationChange,
    onConfirm,
    onCancel,
  }: Props = $props()

  const { t } = useTranslation()
</script>

{#if endingSprintId}
  <div class="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="presentation">
    <div class="w-full max-w-2xl rounded-xl border border-border bg-background p-5 shadow-xl" role="dialog" aria-modal="true" aria-labelledby="end-delivery-title" tabindex="-1">
      <h2 id="end-delivery-title" class="text-lg font-black">{t('project.sprint_panel.end_delivery_title', {}, 'End Sprint delivery')}</h2>
      <p class="mt-1 text-sm text-muted-foreground">{t('project.sprint_panel.end_delivery_help', {}, 'Incomplete work must be explicitly planned before delivery ends.')}</p>
      <div class="mt-4 grid gap-2">
        {#each incompleteTasks as task (task.id)}
          <label class="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm">
            <span class="font-bold">{task.title}</span>
            <select
              class="mt-2 block h-9 w-full rounded-md border border-border bg-background px-2"
              aria-label={`${task.title} destination`}
              value={endDestinations[task.id]}
              onchange={(event) => {
                onDestinationChange(task.id, (event.currentTarget as HTMLSelectElement).value)
              }}
            >
              <option value="">{t('project.sprint_panel.choose_destination', {}, 'Choose destination')}</option>
              <option value="backlog">{t('project.sprint_panel.backlog_title', {}, 'Product Backlog')}</option>
              {#each sprints.filter((candidate) => candidate.status === 'draft' && candidate.id !== endingSprintId) as destination}
                <option value={destination.id}>{destination.name}</option>
              {/each}
            </select>
          </label>
        {/each}
        {#each (board?.sprintTasks ?? []).filter((task) => ['done', 'cancelled', 'rejected'].includes(task.status)) as task (task.id)}
          <div class="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm">
            <div class="font-bold">{task.title}</div>
            <div class="text-xs text-muted-foreground">{task.status} · {t('project.sprint_panel.historical_result', {}, 'Kept in historical Sprint')}</div>
          </div>
        {/each}
      </div>
      {#if endDeliveryError}<p class="mt-3 text-sm font-semibold text-red-600" role="alert">{endDeliveryError}</p>{/if}
      <div class="mt-5 flex justify-end gap-2">
        <Button variant="outline" onclick={onCancel}>{t('project.sprint_panel.cancel', {}, 'Cancel')}</Button>
        <Button onclick={onConfirm}>{t('project.sprint_panel.confirm_end_delivery', {}, 'End delivery')}</Button>
      </div>
    </div>
  </div>
{/if}
