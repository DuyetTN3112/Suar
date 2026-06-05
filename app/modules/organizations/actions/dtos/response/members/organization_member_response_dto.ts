export interface OrganizationMemberResponseDTOProps {
  id: string
  user_id: string
  username: string
  email: string
  org_role: string
  role_name: string
  status: string
  joined_at: string
  last_activity_at?: string | null
}

export class OrganizationMemberResponseDTO {
  public readonly id: string
  public readonly user_id: string
  public readonly username: string
  public readonly email: string
  public readonly org_role: string
  public readonly role_name: string
  public readonly status: string
  public readonly joined_at: string
  public readonly last_activity_at?: string | null

  private constructor(props: OrganizationMemberResponseDTOProps) {
    this.id = props.id
    this.user_id = props.user_id
    this.username = props.username
    this.email = props.email
    this.org_role = props.org_role
    this.role_name = props.role_name
    this.status = props.status
    this.joined_at = props.joined_at
    if (props.last_activity_at !== undefined) {
      this.last_activity_at = props.last_activity_at
    }
  }

  static fromProps(props: OrganizationMemberResponseDTOProps): OrganizationMemberResponseDTO {
    return new OrganizationMemberResponseDTO(props)
  }
}
