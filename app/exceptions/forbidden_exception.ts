import { Exception } from '@adonisjs/core/exceptions'

export default class ForbiddenException extends Exception {
  static override status = 403
  static override code = 'E_FORBIDDEN'
}
