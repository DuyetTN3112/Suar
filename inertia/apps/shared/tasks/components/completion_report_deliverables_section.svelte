<script lang="ts">
  import type { NativeDeliverable } from '../task_completion_report_native_form.types.js'

  interface Props {
    deliverables: readonly NativeDeliverable[]
    selectedDeliverableIds: string[]
    canEdit: boolean
    t: (key: string, fallback: string, params?: Record<string, unknown>) => string
  }

  let {
    deliverables,
    selectedDeliverableIds = $bindable(),
    canEdit,
    t,
  }: Props = $props()
</script>

<section class="space-y-3 rounded border bg-background/70 p-3" aria-labelledby="native-deliverables-heading">
  <h4 id="native-deliverables-heading" class="font-medium">
    {t('task.submission_panel.native.deliverables.title', 'Deliverables')}
  </h4>
  {#if deliverables.length === 0}
    <p class="text-sm text-muted-foreground">
      {t('task.submission_panel.native.deliverables.none', 'No deliverables are pinned to this assignment.')}
    </p>
  {:else}
    <div>
      <p class="text-xs text-muted-foreground">
        {t('task.submission_panel.native.deliverables.expected', 'Expected deliverables from the pinned contract')}
      </p>
      <ul class="mt-1 list-disc space-y-1 pl-5 text-sm">
        {#each deliverables as deliverable}<li>{deliverable.title}</li>{/each}
      </ul>
    </div>
    <p class="text-xs text-muted-foreground">
      {t('task.submission_panel.native.deliverables.select_actual', 'Select the deliverables you actually completed.')}
    </p>
    <div class="grid gap-2 sm:grid-cols-2">
      {#each deliverables as deliverable}
        <label class="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={selectedDeliverableIds.includes(deliverable.id)}
            disabled={!canEdit}
            onchange={() => {
              selectedDeliverableIds = selectedDeliverableIds.includes(deliverable.id)
                ? selectedDeliverableIds.filter((id) => id !== deliverable.id)
                : [...selectedDeliverableIds, deliverable.id]
            }}
          />
          <span>{deliverable.title}</span>
        </label>
      {/each}
    </div>
  {/if}
</section>
