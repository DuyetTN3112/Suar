import { IdDTO, type Query } from '../../shared/index.js'

/**
 * GetUserDetailDTO
 *
 * Data Transfer Object for getting user detail by ID.
 * Used by GetUserDetailQuery.
 */
export class GetUserDetailDTO extends IdDTO implements Query {
  constructor(id: number) {
    super(id)
  }
}
