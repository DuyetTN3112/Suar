<script lang="ts">
  let { task }: { task?: { id?: string; title?: string } } = $props()
</script>

<div data-testid="task-review-zone-stub">
  Review zone stub for {task?.id ?? 'unknown'}
</div>
