import type { TaskVisibilityValue } from '@/apps/org/modules/tasks/lib/rules/task_visibility'

export interface AssigneeOption {
  id: string
  username: string
  email: string
}

export interface AssigneeGroups {
  projectMembers: AssigneeOption[]
  orgMembersOutsideProject: AssigneeOption[]
}

export type AssigneeBucketKey = 'project' | 'organization' | 'external'

export interface VisibleAssigneeBucket {
  key: AssigneeBucketKey
  label: string
  placeholder: string
  users: AssigneeOption[]
}

const BUCKET_META: Record<
  AssigneeBucketKey,
  Pick<VisibleAssigneeBucket, 'key' | 'label' | 'placeholder'>
> = {
  project: {
    key: 'project',
    label: 'In project',
    placeholder: 'Choose a project member',
  },
  organization: {
    key: 'organization',
    label: 'In organization, outside project',
    placeholder: 'Choose an organization member',
  },
  external: {
    key: 'external',
    label: 'External contributor',
    placeholder: 'Choose an external contributor',
  },
}

function buildBucket(
  key: AssigneeBucketKey,
  users: AssigneeOption[]
): VisibleAssigneeBucket {
  return {
    ...BUCKET_META[key],
    users,
  }
}

export function buildVisibleAssigneeBuckets(
  visibility: TaskVisibilityValue | string | null | undefined,
  assigneeGroups: AssigneeGroups,
  fallbackUsers: AssigneeOption[]
): VisibleAssigneeBucket[] {
  const buckets = [
    ...(visibility === 'project'
      ? [buildBucket('project', assigneeGroups.projectMembers)]
      : [
          buildBucket('project', assigneeGroups.projectMembers),
          buildBucket('organization', assigneeGroups.orgMembersOutsideProject),
        ]),
  ]

  if (visibility === 'external' || visibility === 'all') {
    buckets.push(buildBucket('external', fallbackUsers))
  }

  return buckets
}

export function resolveAssigneeVisibilityScope(
  assignedTo: string | null | undefined,
  assigneeGroups: AssigneeGroups,
  fallbackUsers: AssigneeOption[]
): AssigneeBucketKey | null {
  if (!assignedTo) return null

  if (assigneeGroups.projectMembers.some((member) => member.id === assignedTo)) {
    return 'project'
  }

  if (assigneeGroups.orgMembersOutsideProject.some((member) => member.id === assignedTo)) {
    return 'organization'
  }

  if (fallbackUsers.some((member) => member.id === assignedTo)) {
    return 'external'
  }

  return null
}

export function shouldResetAssignedToForVisibility(
  assignedTo: string | null | undefined,
  visibility: TaskVisibilityValue | string | null | undefined,
  assigneeGroups: AssigneeGroups,
  fallbackUsers: AssigneeOption[]
): boolean {
  const currentScope = resolveAssigneeVisibilityScope(assignedTo, assigneeGroups, fallbackUsers)

  if (!currentScope) return false
  if (visibility === 'external' || visibility === 'all') return false

  if (visibility === 'project') return currentScope !== 'project'

  return currentScope === 'external'
}
