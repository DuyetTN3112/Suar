import { inferTaskTypeFromRoleCode } from '@/apps/org/modules/tasks/lib/rules/task_contract_presets'

export function buildRoleTaskLaunchHref(input: {
  baseUrl: string
  projectId: string
  roleId: string
  roleCode?: string | null
  workArea?: string | null
}) {
  const query = new URLSearchParams()
  query.set('project_id', input.projectId)
  query.set('roleId', input.roleId)
  query.set('create', '1')

  const taskType = inferTaskTypeFromRoleCode(input.roleCode)
  if (taskType) query.set('taskType', taskType)
  if (input.workArea) query.set('workArea', input.workArea)

  return `${input.baseUrl}?${query.toString()}`
}
