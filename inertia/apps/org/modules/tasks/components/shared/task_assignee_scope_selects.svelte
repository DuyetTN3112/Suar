<script lang="ts">
  import Label from '@/apps/org/shared/ui/label.svelte'
  import Select from '@/apps/org/shared/ui/select.svelte'
  import SelectContent from '@/apps/org/shared/ui/select_content.svelte'
  import SelectItem from '@/apps/org/shared/ui/select_item.svelte'
  import SelectTrigger from '@/apps/org/shared/ui/select_trigger.svelte'
  import type { TaskVisibilityValue } from '@/apps/org/modules/tasks/lib/rules/task_visibility'
  import {
    buildVisibleAssigneeBuckets,
    resolveAssigneeVisibilityScope,
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

  const visibleBuckets = $derived(
    buildVisibleAssigneeBuckets(visibility, assigneeGroups, fallbackUsers)
  )
  const selectedScope = $derived(
    resolveAssigneeVisibilityScope(assignedTo, assigneeGroups, fallbackUsers)
  )
  const { t } = useTranslation()

  function getUserLabel(user: AssigneeOption): string {
    return user.username || user.email
  }

  function getBucketLabel(key: AssigneeBucketKey, fallback: string): string {
    return t(`task.assignee_scope.${key}.label`, {}, fallback)
  }

  function getBucketPlaceholder(key: AssigneeBucketKey, fallback: string): string {
    return t(`task.assignee_scope.${key}.placeholder`, {}, fallback)
  }
</script>

<div class="grid gap-3">
  {#each visibleBuckets as bucket (bucket.key)}
    {@const selectedUser =
      selectedScope === bucket.key
        ? bucket.users.find((user) => user.id === assignedTo) ?? null
        : null}
    {@const isDisabled = disabled || bucket.users.length === 0}

    <div class="grid gap-2">
      <Label for={`assigned_to_${bucket.key}`}>
        {getBucketLabel(bucket.key, bucket.label)} ({bucket.users.length})
      </Label>
      <Select
        value={selectedScope === bucket.key ? assignedTo : ''}
        onValueChange={(value: string) => {
          onSelect(value)
        }}
        disabled={isDisabled}
      >
        <SelectTrigger disabled={isDisabled} class="min-w-0">
          <span class="min-w-0 flex-1 truncate text-left">
            {selectedUser ? getUserLabel(selectedUser) : bucket.users.length > 0 ? getBucketPlaceholder(bucket.key, bucket.placeholder) : t('task.assignee_scope.no_matching_user', {}, 'No matching user')}
          </span>
        </SelectTrigger>
        <SelectContent class="max-h-80">
          {#each bucket.users as user (user.id)}
            <SelectItem value={user.id} label={getUserLabel(user)}>
              {getUserLabel(user)}
            </SelectItem>
          {/each}
        </SelectContent>
      </Select>
    </div>
  {/each}
</div>
