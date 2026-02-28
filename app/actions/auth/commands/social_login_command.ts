import User from '#models/user'
import UserOAuthProvider from '#models/user_oauth_provider'
import db from '@adonisjs/lucid/services/db'
import * as AuthLogger from '#libs/auth_logger'
import BusinessLogicException from '#exceptions/business_logic_exception'
import { SystemRoleName } from '#constants/user_constants'

type SupportedProvider = 'google' | 'github'

interface SocialUserData {
  id: string
  email: string
  name: string
  nickName: string | null
  token: string
  refreshToken: string | null
}

interface SocialLoginResult {
  user: User
  isNewUser: boolean
  redirectTo: string
}

/**
 * Command: Social Login
 *
 * Handles the full social login flow:
 * 1. Check if OAuth provider record exists → login existing user
 * 2. Check if user with email exists → link provider + login
 * 3. Create new user + OAuth record → login
 */
export default class SocialLoginCommand {
  async execute(
    provider: SupportedProvider,
    socialData: SocialUserData
  ): Promise<SocialLoginResult> {
    const {
      id: socialId,
      email: socialEmail,
      name: socialName,
      nickName,
      token: accessToken,
      refreshToken,
    } = socialData

    // Step 1: Check existing OAuth provider record
    let oauthProvider: UserOAuthProvider | null = null
    try {
      oauthProvider = await UserOAuthProvider.query()
        .where('provider', provider)
        .where('provider_id', socialId)
        .first()
      AuthLogger.oauthProviderLookup(provider, socialId, !!oauthProvider)
    } catch (error: unknown) {
      AuthLogger.oauthError(provider, error, 'provider-lookup')
      // Table might not exist — continue with null
      const dbError = error as { code?: string }
      if (dbError.code !== '42P01') {
        // Not a missing table error — continue anyway
      }
    }

    if (oauthProvider) {
      const user = await User.find(oauthProvider.user_id)
      if (user) {
        // Update tokens
        try {
          oauthProvider.access_token = accessToken
          oauthProvider.refresh_token = refreshToken
          await oauthProvider.save()
          AuthLogger.dbTransaction('update-oauth-tokens', true, { userId: user.id })
        } catch (error: unknown) {
          AuthLogger.oauthError(provider, error, 'update-tokens')
        }
        AuthLogger.userLogin(user.id, user.email || '', provider)
        return { user, isNewUser: false, redirectTo: '/tasks' }
      }
    }

    // Step 2: Find user by email
    let user = await User.findBy('email', socialEmail)
    AuthLogger.dbTransaction('find-user-by-email', true, { email: socialEmail, found: !!user })

    if (user) {
      // Link OAuth provider
      try {
        await UserOAuthProvider.create({
          user_id: user.id,
          provider,
          provider_id: socialId,
          email: socialEmail,
          access_token: accessToken,
          refresh_token: refreshToken,
        })
        AuthLogger.dbTransaction('link-oauth-provider', true, { userId: user.id, provider })
      } catch (error: unknown) {
        AuthLogger.oauthError(provider, error, 'link-oauth-provider')
        const dbError = error as { code?: string }
        if (dbError.code !== '42P01') {
          // Not a missing table error
        }
      }

      // Update auth_method if still email
      try {
        if (user.auth_method === 'email') {
          user.auth_method = provider
          await user.save()
        }
      } catch (error: unknown) {
        const dbError = error as { code?: string }
        if (dbError.code !== '42703') {
          // Not a missing column error
        }
      }

      AuthLogger.userLogin(user.id, user.email || '', provider)
      return { user, isNewUser: false, redirectTo: '/tasks' }
    }

    // Step 3: Create new user
    AuthLogger.dbTransaction('create-new-user-start', true, { provider, email: socialEmail })

    await db.transaction(async (trx) => {
      const defaultSystemRole = SystemRoleName.REGISTERED_USER
      AuthLogger.dbTransaction('found-defaults', true, { systemRole: defaultSystemRole })

      // Parse name
      let firstName = ''
      let lastName = ''
      const nameParts = socialName.split(' ')
      if (nameParts.length > 0) {
        lastName = nameParts.pop() ?? ''
        firstName = nameParts.join(' ')
      }
      if (!firstName && !lastName && socialName) {
        firstName = socialName
      }

      // Generate username
      const username = nickName || socialEmail.split('@')[0] || `user_${Date.now()}`

      try {
        interface UserData {
          email: string
          username: string
          status: string
          system_role: string
          current_organization_id: null
          auth_method?: 'google' | 'github' | 'email'
        }
        const userData: UserData = {
          email: socialEmail,
          username,
          status: 'active',
          system_role: defaultSystemRole,
          current_organization_id: null,
        }
        userData.auth_method = provider

        user = await User.create(userData, { client: trx })
        AuthLogger.userCreated(user.id, provider, user.email || '')
      } catch (error: unknown) {
        AuthLogger.oauthError(provider, error, 'create-user-record')
        throw error
      }

      // Create OAuth provider record
      try {
        await UserOAuthProvider.create(
          {
            user_id: user.id,
            provider,
            provider_id: socialId,
            email: socialEmail,
            access_token: accessToken,
            refresh_token: refreshToken,
          },
          { client: trx }
        )
        AuthLogger.dbTransaction('create-oauth-provider', true, { userId: user.id, provider })
      } catch (error: unknown) {
        AuthLogger.oauthError(provider, error, 'create-oauth-provider')
        const dbError = error as { code?: string }
        if (dbError.code !== '42P01') {
          throw error
        }
      }

      AuthLogger.dbTransaction('create-user-complete', true, { userId: user.id })
    })

    if (!user) {
      throw new BusinessLogicException('User creation failed')
    }

    const createdUser = user as User
    AuthLogger.userLogin(createdUser.id, createdUser.email || '', provider)
    return { user: createdUser, isNewUser: true, redirectTo: '/organizations' }
  }
}
