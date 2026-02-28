import type { Task } from '../types'

export const canDeleteTask = (task: Task, currentUser: any): boolean => {
  if (!currentUser || !currentUser.id) {
    return false
  }

  const userRole = currentUser.role || currentUser.system_role || ''
  const isSuperAdmin = userRole === 'superadmin'

  if (isSuperAdmin) {
    return true
  }

  const taskOrgId = task.organization_id
  const userOrgId = currentUser.organization_id

  if (taskOrgId && userOrgId && taskOrgId !== userOrgId) {
    return false
  }

  if (userRole === 'admin') {
    return true
  }

  const creatorId = task.created_by || (task.creator && task.creator.id)
  const isCreator = Boolean(creatorId && creatorId === currentUser.id)

  if (isCreator) {
    return true
  }

  return false
}

export const getRoleFromAuth = (): string => {
  const authUser = (window as any).auth?.user
  if (!authUser) {
    if (import.meta.env.DEV) {
      console.log('Debug - getRoleFromAuth: No auth user found')
    }
    return ''
  }

  if (authUser.userRole) {
    return authUser.userRole
  }

  if (authUser.system_role) {
    return authUser.system_role.toLowerCase()
  }

  if (typeof authUser.role === 'string' && authUser.role) {
    return authUser.role.toLowerCase()
  }

  return ''
}

export const canEditTask = (task: Task, currentUser: any): boolean => {
  if (!currentUser || !currentUser.id) {
    return false
  }

  const userRole = getRoleFromAuth()
  const isSuperAdmin = userRole === 'superadmin'

  if (isSuperAdmin) {
    return true
  }

  const taskOrgId = task.organization_id
  const userOrgId = currentUser.organization_id

  if (taskOrgId && userOrgId && taskOrgId !== userOrgId) {
    return false
  }

  if (userRole === 'admin') {
    return true
  }

  const creatorId = task.created_by || (task.creator && task.creator.id)
  const isCreator = Boolean(creatorId && creatorId === currentUser.id)

  const assigneeId = task.assigned_to || (task.assignee && task.assignee.id)
  const isAssignee = Boolean(assigneeId && assigneeId === currentUser.id)

  return isCreator || isAssignee
}

export const canViewTask = (task: Task, currentUser: any): boolean => {
  if (!currentUser || !currentUser.id) {
    return false
  }

  const userRole = getRoleFromAuth()
  const isSuperAdmin = userRole === 'superadmin'

  if (isSuperAdmin) {
    return true
  }

  const taskOrgId = task.organization_id
  const userOrgId = currentUser.organization_id

  if (taskOrgId && userOrgId && taskOrgId === userOrgId) {
    return true
  }

  return false
}
