<script lang="ts">
  import Label from '@/apps/org/shared/ui/label.svelte'
  import Select from '@/apps/org/shared/ui/select.svelte'
  import SelectContent from '@/apps/org/shared/ui/select_content.svelte'
  import SelectItem from '@/apps/org/shared/ui/select_item.svelte'
  import SelectTrigger from '@/apps/org/shared/ui/select_trigger.svelte'
  import type { TaskVisibilityValue } from '@/apps/org/modules/tasks/lib/rules/task_visibility'
  import {
    buildVisibleAssigneeBuckets,
    type AssigneeGroups,
    type AssigneeOption,
    type AssigneeBucketKey,
  } from '@/apps/org/modules/tasks/lib/task_assignee_scope'
  import { useTranslation } from '@/apps/org/shared/stores/translation.svelte'

  interface Props {
    visibility: TaskVisibilityValue
    assignedTo: string
    assigneeGroups: AssigneeGroups
    fallbackUsers: AssigneeOption[]
    disabled?: boolean
    onSelect: (value: string) => void
  }

  const {
    visibility,
    assignedTo,
    assigneeGroups,
    fallbackUsers,
    disabled = false,
    onSelect,
  }: Props = $props()

  const visibleBuckets = $derived(buildVisibleAssigneeBuckets(visibility, assigneeGroups, fallbackUsers))
  const visibleUsers = $derived(
    visibleBuckets.flatMap((bucket) =>
      bucket.users.map((user) => ({
        ...user,
        scope: bucket.key,
      }))
    )
  )
  const { t } = useTranslation()
  const visibleUserCount = $derived(visibleUsers.length)

  function getUserLabel(user: AssigneeOption): string {
    return user.username || user.email
  }

  function getScopeLabel(key: AssigneeBucketKey): string {
    return t(`task.assignee_scope.${key}.short_label`, {}, key === 'project' ? 'Chỉ trong project' : key === 'organization' ? 'Trong tổ chức (bao gồm project)' : 'Bên ngoài tổ chức')
  }
</script>

<div class="grid gap-3">
  <div class="grid gap-2">
    <Label for="assigned_to">{t('task.assignee_scope.single_label', {}, 'Người thực hiện (chọn 1 người)')}</Label>
    <p class="text-xs text-muted-foreground" data-testid="task-assignee-scope-summary">
      {t('task.assignee_scope.available_count', { count: visibleUserCount }, `${visibleUserCount} người có thể chọn`)}
    </p>
    <Select value={assignedTo} onValueChange={(value: string) => { onSelect(value) }} disabled={disabled || visibleUsers.length === 0}>
      <SelectTrigger id="assigned_to" disabled={disabled || visibleUsers.length === 0} class="min-w-0">
        <span class="min-w-0 flex-1 truncate text-left">
          {#if assignedTo}
            {getUserLabel(visibleUsers.find((user) => user.id === assignedTo) ?? { id: '', username: '', email: '' })}
          {:else}
            {t('task.assignee_scope.single_placeholder', {}, 'Chọn một người thực hiện')}
          {/if}
        </span>
      </SelectTrigger>
      <SelectContent class="max-h-80">
        {#each visibleUsers as user (user.id)}
          <SelectItem value={user.id} label={`${getUserLabel(user)} · ${getScopeLabel(user.scope)}`}>
            <span class="flex min-w-0 flex-col items-start">
              <span class="truncate">{getUserLabel(user)}</span>
              <span class="text-xs text-muted-foreground">{getScopeLabel(user.scope)}</span>
            </span>
          </SelectItem>
        {/each}
      </SelectContent>
    </Select>
    {#if visibleUsers.length === 0}
      <p class="text-xs text-muted-foreground">{t('task.assignee_scope.no_matching_user', {}, 'Không có người phù hợp')}</p>
    {/if}
  </div>
</div>
