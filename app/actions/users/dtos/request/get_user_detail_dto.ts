import type { Query } from '../../interfaces.js'

import { IdDTO } from '#types/action_dtos'

/**
 * GetUserDetailDTO
 *
 * Data Transfer Object for getting user detail by ID.
 * Used by GetUserDetailQuery.
 */
export class GetUserDetailDTO extends IdDTO implements Query {}
