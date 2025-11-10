
export type SerializedDateTime = string | null

export interface ProjectRecord extends Record<string, unknown> {
  id: string
  creator_id: string
  name: string
  description: string | null
  organization_id: string
  start_date: SerializedDateTime
  end_date: SerializedDateTime
  status: string
  budget: number | null
  manager_id: string | null
  owner_id: string | null
  visibility: string
  allow_freelancer: boolean
  approval_required_for_members: boolean
  tags: string[] | null
  custom_roles: Record<string, unknown>[] | null
  deleted_at: SerializedDateTime
  created_at: SerializedDateTime
  updated_at: SerializedDateTime
}

export interface ProjectDetailRecord extends ProjectRecord {
  organization?: { id: string; name: string; [key: string]: unknown }
  creator?: { id: string; username: string; [key: string]: unknown }
  manager?: { id: string; username: string; [key: string]: unknown } | null
  owner?: { id: string; username: string; [key: string]: unknown } | null
}

export interface ProjectMemberRecord extends Record<string, unknown> {
  id: string
  project_id: string
  user_id: string
  role: string
  joined_at: SerializedDateTime
  left_at: SerializedDateTime | null
}
