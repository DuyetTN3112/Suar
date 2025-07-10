<script lang="ts">
  import Checkbox from '@/components/ui/checkbox.svelte'
  import { useTranslation } from '@/stores/translation.svelte'
  import type { TaskStore } from '@/stores/tasks.svelte'
  import type { TaskDisplayProperties } from '@/stores/tasks.svelte'

  interface Props {
    store: TaskStore
  }

  const { store }: Props = $props()
  const { t } = useTranslation()

  const properties: Array<{ key: keyof TaskDisplayProperties; label: string }> = [
    { key: 'status', label: t('task.status', {}, 'Trạng thái') },
    { key: 'priority', label: t('task.priority', {}, 'Ưu tiên') },
    { key: 'label', label: t('task.label', {}, 'Nhãn') },
    { key: 'assignee', label: t('task.assignee', {}, 'Người thực hiện') },
    { key: 'dueDate', label: t('task.due_date', {}, 'Hạn chót') },
    { key: 'createdAt', label: t('task.created_at', {}, 'Ngày tạo') },
    { key: 'difficulty', label: t('task.difficulty', {}, 'Độ khó') },
    { key: 'estimatedTime', label: t('task.estimated_time', {}, 'Thời gian ước tính') },
    { key: 'progress', label: t('task.progress', {}, 'Tiến độ') },
    { key: 'project', label: t('task.project', {}, 'Dự án') },
  ]
</script>

<div class="rounded-lg border bg-card p-4">
  <p class="text-xs font-medium text-muted-foreground mb-3">
    {t('task.display_properties', {}, 'Thuộc tính hiển thị')}
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
