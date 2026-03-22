export interface User {
  id: string
  username: string
  email: string
  current_organization_id?: string | null
  organizations?: Array<{
    id: string
    name: string
  }>
}

export interface Organization {
  id: string
  name: string
}

export interface ProjectStatus {
  value: string
  label: string
  description?: string
}

export interface ProjectMember {
  id?: string
  user_id?: string
  username: string
  email: string
  role: string
  joined_at?: string
  task_count?: number
}

export interface Task {
  id: string
  title: string
  description?: string
  status: string
  label?: string
  priority?: string
  assignee_name?: string
  due_date?: string
}

export interface Project {
  id: string
  name: string
  description?: string
  organization_id: string
  organization_name?: string
  creator_id: string
  creator_name?: string
  manager_id?: string
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
