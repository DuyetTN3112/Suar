import { SocialWebSessionLogin } from '#modules/auth/actions/ports/outbound/social_web_session_login'
import UserModel from '#modules/users/infra/models/user'

export class SocialWebSessionLoginAdapter extends SocialWebSessionLogin {
  async login(
    session: Parameters<SocialWebSessionLogin['login']>[0],
    userId: string,
    remember: boolean,
    currentOrganizationId: string | null
  ): Promise<void> {
    const user = await UserModel.findOrFail(userId)
    await session.loginIdentity(user, remember)
    if (currentOrganizationId) {
      session.setCurrentOrganizationId(currentOrganizationId)
    }
  }
}
