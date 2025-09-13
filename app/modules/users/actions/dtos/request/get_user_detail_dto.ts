import type { Query } from '../../interfaces.js'

import { UserIdDTO } from '#modules/users/application/dtos/common/user_action_dtos'

/**
 * GetUserDetailDTO
 *
 * Data Transfer Object for getting user detail by ID.
 * Used by GetUserDetailQuery.
 */
export class GetUserDetailDTO extends UserIdDTO implements Query {}
