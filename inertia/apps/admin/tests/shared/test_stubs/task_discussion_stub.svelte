<script lang="ts">
  let { children, taskId, currentUserId, } = $props<{ 
    children?: import('svelte').Snippet; 
    taskId?: string;
    currentUserId?: string | null;
    [key: string]: unknown 
  }>()
</script>
<div data-testid="task-discussion-stub">
  Discussion stub for {taskId} / {currentUserId ?? 'anonymous'}
  {#if children}
    {@render children()}
  {/if}
</div>