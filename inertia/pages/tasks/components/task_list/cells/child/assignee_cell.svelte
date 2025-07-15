<script lang="ts">
  import { User } from 'lucide-svelte'

  interface Props {
    assignee?: {
      id?: string
      username?: string
      email?: string
    }
  }

  const { assignee }: Props = $props()

  const assigneeLabel = $derived(
    assignee
      ? (assignee.username ?? assignee.email) ?? (assignee.id ? `User #${assignee.id}` : 'Chưa gán')
      : 'Chưa gán'
  )
</script>

<div class="flex items-center gap-1">
  <User class="h-3 w-3 text-muted-foreground flex-shrink-0" />
  {#if assignee}
    <span class="text-[11px] truncate">
      {assigneeLabel}
    </span>
  {:else}
    <span class="text-[11px] text-muted-foreground">Chưa gán</span>
  {/if}
</div>
