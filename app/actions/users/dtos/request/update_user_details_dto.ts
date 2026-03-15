/**
 * UpdateUserDetailsDTO
 *
 * Data transfer object for updating user profile details.
 * Used by UpdateUserDetailsCommand.
 */
export class UpdateUserDetailsDTO {
  declare avatar_url?: string | null
  declare bio?: string | null
  declare phone?: string | null
  declare address?: string | null
  declare timezone?: string
  declare language?: string
  declare is_freelancer?: boolean

  constructor(data: Partial<UpdateUserDetailsDTO>) {
    Object.assign(this, data)
  }
}
