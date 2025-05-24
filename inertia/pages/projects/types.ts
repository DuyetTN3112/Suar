import { DateTime } from 'luxon'

export interface User {
  id: number
  username: string
  email: string
  current_organization_id?: number | null
}

export interface Organization {
  id: number
  name: string
}

export interface ProjectStatus {
  id: number
  name: string
  description?: string
}

export interface ProjectMember {
  id: number
  username: string
  email: string
  role: string
}

export interface Task {
  id: number
  title: string
  description?: string
  status: string
  label?: string
  priority?: string
  assignee_name?: string
  due_date?: string
}

export interface Project {
  id: number
  name: string
  description?: string
  organization_id: number
  organization_name?: string
  creator_id: number
  creator_name?: string
  manager_id?: number
  manager_name?: string
  start_date?: string
  end_date?: string
  status?: string
  budget?: number
  visibility?: 'public' | 'private' | 'team'
  created_at: string
  updated_at: string
}

export interface ProjectsIndexProps {
  projects: Project[]
  auth: {
    user: User
  }
  showOrganizationRequiredModal?: boolean
}

export interface ProjectShowProps {
  project: Project
  members: ProjectMember[]
  tasks: Task[]
  permissions: {
    isCreator: boolean
    isManager: boolean
    isMember: boolean
  }
  auth: {
    user: User
  }
}

export interface ProjectCreateProps {
  organizations: Organization[]
  statuses: ProjectStatus[]
  auth: {
    user: User
  }
}
