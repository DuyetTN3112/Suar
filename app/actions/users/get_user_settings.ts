import { inject } from '@adonisjs/core'
import { HttpContext } from '@adonisjs/core/http'
import UserSetting from '#models/user_setting'

@inject()
export default class GetUserSettings {
  constructor(protected ctx: HttpContext) {}

  async handle() {
    const user = this.ctx.auth.user!
    const settings = await UserSetting.query().where('user_id', user.id).first()
    return settings || {}
  }
}
