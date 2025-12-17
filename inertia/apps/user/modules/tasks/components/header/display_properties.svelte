<script lang="ts">
  import Checkbox from '@/apps/user/shared/ui/checkbox.svelte'
  import type { TaskStore, TaskDisplayProperties  } from '@/apps/user/modules/tasks/stores/tasks.svelte'
  import { useTranslation } from '@/apps/user/shared/stores/translation.svelte'

  interface Props {
    store: TaskStore
  }

  const { store }: Props = $props()
  const { t } = useTranslation()

  const properties: { key: keyof TaskDisplayProperties; label: string }[] = [
    { key: 'status', label: t('task.status', {}, 'Status') },
    { key: 'priority', label: t('task.priority', {}, 'Priority') },
    { key: 'label', label: t('task.label', {}, 'Label') },
    { key: 'assignee', label: t('task.assignee', {}, 'Assignee') },
    { key: 'dueDate', label: t('task.due_date', {}, 'Due date') },
    { key: 'createdAt', label: t('task.created_at', {}, 'Created at') },
    { key: 'difficulty', label: t('task.difficulty', {}, 'Difficulty') },
    { key: 'estimatedTime', label: t('task.estimated_time', {}, 'Estimated time') },
    { key: 'progress', label: t('task.progress', {}, 'Progress') },
    { key: 'project', label: t('task.project', {}, 'Project') },
  ]
</script>

<div class="rounded-lg border bg-card p-4">
  <p class="text-xs font-medium text-muted-foreground mb-3">
    {t('task.display_properties', {}, 'Display properties')}
  </p>
  <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
    {#each properties as prop}
      <label class="flex items-center gap-2 text-sm cursor-pointer select-none hover:text-foreground text-muted-foreground transition-colors">
        <Checkbox
          checked={store.displayProperties[prop.key]}
          onCheckedChange={() => { store.toggleDisplayProperty(prop.key); }}
        />
        <span class={store.displayProperties[prop.key] ? 'text-foreground' : ''}>
          {prop.label}
        </span>
      </label>
    {/each}
  </div>
</div>
