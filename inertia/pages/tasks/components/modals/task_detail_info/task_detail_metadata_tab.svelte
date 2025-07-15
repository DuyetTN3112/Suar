<script lang="ts">
  import {
    Calendar,
    User,
    Clock,
    Briefcase,
    Hash,
    GitMerge,
    Users,
    AlarmClock,
    Timer
  } from 'lucide-svelte'

  import type { Task } from '../../../types.svelte'
  import { formatDate } from '../../../utils/task_formatter.svelte'

  interface Props {
    task: Task
    users?: {
      id: string
      username: string
      email: string
    }[]
  }

  const props: Props = $props()

  const creator = $derived(props.users?.find((user) => user.id === props.task.creator_id))
  const assignee = $derived(props.users?.find((user) => user.id === props.task.assigned_to))
  const childTasksCount = $derived(props.task.childTasks?.length ?? 0)

  function getUserInitials(user?: { username: string; email: string }): string {
    if (!user) return '?'

    return user.username.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase() || '?'
  }

  function getUserDisplayName(user?: { username: string; email: string }): string {
    if (!user) return 'Không có thông tin'

    return user.username || user.email || 'Không có thông tin'
  }

  function formatTime(minutes?: number): string {
    if (!minutes) return '0h'

    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60

    if (hours === 0) return `${mins}m`
    if (mins === 0) return `${hours}h`
    return `${hours}h ${mins}m`
  }
</script>

<div class="space-y-6 py-2">
  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div class="bg-muted/30 p-3 rounded-md">
      <div class="flex items-center mb-2">
        <User class="h-4 w-4 mr-2 text-muted-foreground" />
        <p class="text-xs font-medium text-muted-foreground">Người tạo</p>
      </div>
      <div class="flex items-center gap-2">
        <div class="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-white text-xs">
          {getUserInitials(creator)}
        </div>
        <span class="text-sm font-medium">{getUserDisplayName(creator)}</span>
      </div>
    </div>

    <div class="bg-muted/30 p-3 rounded-md">
      <div class="flex items-center mb-2">
        <Users class="h-4 w-4 mr-2 text-muted-foreground" />
        <p class="text-xs font-medium text-muted-foreground">Người được giao</p>
      </div>
      <div class="flex items-center gap-2">
        {#if assignee}
          <div class="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-white text-xs">
            {getUserInitials(assignee)}
          </div>
          <span class="text-sm font-medium">{getUserDisplayName(assignee)}</span>
        {:else}
          <span class="text-sm text-muted-foreground">Chưa được giao</span>
        {/if}
      </div>
    </div>

    <div class="bg-muted/30 p-3 rounded-md">
      <div class="space-y-3">
        <div>
          <div class="flex items-center mb-1">
            <Calendar class="h-4 w-4 mr-2 text-muted-foreground" />
            <p class="text-xs font-medium text-muted-foreground">Ngày tạo</p>
          </div>
          <p class="text-sm ml-6">{formatDate(props.task.created_at)}</p>
        </div>

        <div>
          <div class="flex items-center mb-1">
            <Clock class="h-4 w-4 mr-2 text-muted-foreground" />
            <p class="text-xs font-medium text-muted-foreground">Cập nhật lần cuối</p>
          </div>
          <p class="text-sm ml-6">{formatDate(props.task.updated_at)}</p>
        </div>

        <div>
          <div class="flex items-center mb-1">
            <Calendar class="h-4 w-4 mr-2 text-muted-foreground" />
            <p class="text-xs font-medium text-muted-foreground">Ngày hạn</p>
          </div>
          <p class="text-sm ml-6">{props.task.due_date ? formatDate(props.task.due_date) : 'Không có'}</p>
        </div>
      </div>
    </div>

    <div class="bg-muted/30 p-3 rounded-md">
      <div class="space-y-3">
        <div>
          <div class="flex items-center mb-1">
            <AlarmClock class="h-4 w-4 mr-2 text-muted-foreground" />
            <p class="text-xs font-medium text-muted-foreground">Thời gian ước tính</p>
          </div>
          <p class="text-sm ml-6">{formatTime(props.task.estimated_time) || 'Không có'}</p>
        </div>

        <div>
          <div class="flex items-center mb-1">
            <Timer class="h-4 w-4 mr-2 text-muted-foreground" />
            <p class="text-xs font-medium text-muted-foreground">Thời gian thực tế</p>
          </div>
          <p class="text-sm ml-6">{formatTime(props.task.actual_time) || 'Không có'}</p>
        </div>
      </div>
    </div>
  </div>

  <div class="bg-muted/30 p-3 rounded-md">
    <h3 class="text-sm font-medium mb-3">Thông tin khác</h3>

    <div class="space-y-3">
      <div class="flex items-start">
        <Hash class="h-4 w-4 mr-2 text-muted-foreground mt-0.5" />
        <div>
          <p class="text-xs font-medium text-muted-foreground">ID</p>
          <p class="text-sm">{props.task.id}</p>
        </div>
      </div>

      <div class="flex items-start">
        <Briefcase class="h-4 w-4 mr-2 text-muted-foreground mt-0.5" />
        <div>
          <p class="text-xs font-medium text-muted-foreground">Tổ chức</p>
          <p class="text-sm">{props.task.organization?.name ?? (props.task.organization_id ? `ID: ${props.task.organization_id}` : 'Không có')}</p>
        </div>
      </div>

      {#if props.task.parent_task_id}
        <div class="flex items-start">
          <GitMerge class="h-4 w-4 mr-2 text-muted-foreground mt-0.5" />
          <div>
            <p class="text-xs font-medium text-muted-foreground">Task cha</p>
            <p class="text-sm">
              {props.task.parentTask ? `#${props.task.parentTask.id}: ${props.task.parentTask.title}` : `ID: ${props.task.parent_task_id}`}
            </p>
          </div>
        </div>
      {/if}

      {#if childTasksCount > 0}
        <div class="flex items-start">
          <GitMerge class="h-4 w-4 mr-2 text-muted-foreground mt-0.5" />
          <div>
            <p class="text-xs font-medium text-muted-foreground">Task con</p>
            <p class="text-sm">{childTasksCount} task con</p>
          </div>
        </div>
      {/if}
    </div>
  </div>
</div>
