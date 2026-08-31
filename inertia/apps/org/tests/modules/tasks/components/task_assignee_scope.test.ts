import { describe, expect, it } from 'vitest'

import {
  buildVisibleAssigneeBuckets,
  resolveAssigneeVisibilityScope,
  shouldResetAssignedToForVisibility,
} from '@/apps/org/modules/tasks/lib/task_assignee_scope'

const assigneeGroups = {
  projectMembers: [
    { id: 'project-1', username: 'LinhPM', email: 'linh@example.com' },
  ],
  orgMembersOutsideProject: [
    { id: 'org-1', username: 'HaQA', email: 'ha@example.com' },
  ],
}

const fallbackUsers = [
  { id: 'external-1', username: 'MaiExternalContributor', email: 'mai@example.com' },
]

describe('task assignee scope helpers', () => {
  it('shows only project and organization buckets for internal tasks', () => {
    const buckets = buildVisibleAssigneeBuckets('internal', assigneeGroups, fallbackUsers)

    expect(buckets.map((bucket) => bucket.key)).toEqual(['project', 'organization'])
    expect(buckets[0]?.users).toEqual(assigneeGroups.projectMembers)
    expect(buckets[1]?.users).toEqual(assigneeGroups.orgMembersOutsideProject)
  })

  it('shows only project members for project-only tasks', () => {
    const buckets = buildVisibleAssigneeBuckets('project', assigneeGroups, fallbackUsers)

    expect(buckets.map((bucket) => bucket.key)).toEqual(['project'])
    expect(buckets[0]?.users).toEqual(assigneeGroups.projectMembers)
  })

  it('shows all three buckets for marketplace-facing tasks', () => {
    const externalBuckets = buildVisibleAssigneeBuckets('external', assigneeGroups, fallbackUsers)
    const hybridBuckets = buildVisibleAssigneeBuckets('all', assigneeGroups, fallbackUsers)

    expect(externalBuckets.map((bucket) => bucket.key)).toEqual([
      'project',
      'organization',
      'external',
    ])
    expect(hybridBuckets.map((bucket) => bucket.key)).toEqual([
      'project',
      'organization',
      'external',
    ])
    expect(externalBuckets[2]?.users).toEqual(fallbackUsers)
  })

  it('resolves the assignee scope and clears invalid marketplace picks when visibility becomes internal', () => {
    expect(
      resolveAssigneeVisibilityScope('project-1', assigneeGroups, fallbackUsers)
    ).toBe('project')
    expect(
      resolveAssigneeVisibilityScope('org-1', assigneeGroups, fallbackUsers)
    ).toBe('organization')
    expect(
      resolveAssigneeVisibilityScope('external-1', assigneeGroups, fallbackUsers)
    ).toBe('external')

    expect(
      shouldResetAssignedToForVisibility('external-1', 'internal', assigneeGroups, fallbackUsers)
    ).toBe(true)
    expect(
      shouldResetAssignedToForVisibility('project-1', 'internal', assigneeGroups, fallbackUsers)
    ).toBe(false)
    expect(
      shouldResetAssignedToForVisibility('external-1', 'external', assigneeGroups, fallbackUsers)
    ).toBe(false)
    expect(
      shouldResetAssignedToForVisibility('org-1', 'project', assigneeGroups, fallbackUsers)
    ).toBe(true)
    expect(
      shouldResetAssignedToForVisibility('project-1', 'project', assigneeGroups, fallbackUsers)
    ).toBe(false)
  })
})
