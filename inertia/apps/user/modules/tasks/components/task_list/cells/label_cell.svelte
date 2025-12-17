<script lang="ts">
  import type { TaskDetail } from '@/apps/user/modules/tasks/types/index.svelte'

  interface Props {
    task: TaskDetail
  }

  const { task }: Props = $props()

  const labelStyles: Record<string, string> = {
    bug: 'border border-destructive/20 bg-destructive/10 text-destructive',
    feature: 'border border-border/50 bg-muted text-foreground',
    enhancement: 'border border-primary/20 bg-accent text-accent-foreground',
    documentation: 'border border-primary/20 bg-primary/10 text-foreground',
  }
  const labelClass = $derived(labelStyles[task.label] ?? 'border border-muted bg-muted/40 text-foreground')
</script>

<div class="text-xs inline-flex items-center whitespace-nowrap font-semibold rounded-full px-2 py-0.5 {labelClass}">
  {task.label}
</div>
