import type { Task } from '../types'

export const canDeleteTask = (task: Task, currentUser: any): boolean => {
  if (!currentUser || !currentUser.id) {
    return false
  }

  const userRole = currentUser.role || ''
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

  const creatorId = task.creator_id || (task.creator && task.creator.id)
  const isCreator = creatorId && Number(creatorId) === Number(currentUser.id)

  if (isCreator) {
    return true
  }

  return false
}

export const getRoleFromAuth = () => {
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

  if (typeof authUser.role === 'string') {
    return authUser.role.toLowerCase()
  }

  if (typeof authUser.role === 'object' && authUser.role) {
    if (authUser.role.name) {
      return authUser.role.name.toLowerCase()
    }

    if (authUser.role.id === 1) {
      return 'superadmin'
    }
    if (authUser.role.id === 2) {
      return 'admin'
    }
    if (authUser.role.id === 3) {
      return 'user'
    }
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

  const creatorId = task.creator_id || (task.creator && task.creator.id)
  const isCreator = creatorId && Number(creatorId) === Number(currentUser.id)

  const assigneeId = task.assigned_to || (task.assignee && task.assignee.id)
  const isAssignee = assigneeId && Number(assigneeId) === Number(currentUser.id)

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
