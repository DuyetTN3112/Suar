import { SystemRoleName, UserStatusName } from '#modules/users/constants/user_constants'

/**
 * v3: system_roles + user_statuses tables removed.
 * Return static enum values instead of DB queries.
 */
export default class GetUserMetadata {
  handle() {
    const roles = Object.values(SystemRoleName).map((name) => ({ name }))
    const statuses = Object.values(UserStatusName).map((name) => ({ name }))
    return {
      roles,
      statuses,
    }
  }
}
