import type { ApplicationService } from '@adonisjs/core/types'

import { AuthorizationUserIdentityReaderAdapter } from './adapters/authorization_user_identity_reader_adapter.js'
import { OrganizationsAuthorizationAccessReaderAdapter } from './adapters/organizations_authorization_access_reader_adapter.js'
import {
  authEventIdentityGenerator,
  authLogoutEventPublisher,
  authOrganizationMembershipReader,
  authSessionIdentityReader,
  authSessionObservationStager,
  authSessionTokenStore,
  authSystemAccessReader,
  authWebSessionUserReader,
  processSocialAuthCallbackCommand,
  issueSessionTokenCommand,
  logoutUserCommand,
  refreshSessionTokenCommand,
  socialAuthCallbackReader,
  socialLoginIdentityPersistence,
  socialLoginPersistence,
  verifySessionAccessTokenQuery,
} from './auth_application_composition.js'

import { userIdentityReader } from '#composition/user_application_composition'
import { IssueSessionTokenCommand } from '#modules/auth/actions/commands/issue_session_token_command'
import LogoutUserCommand from '#modules/auth/actions/commands/logout_user_command'
import ProcessSocialAuthCallbackCommand from '#modules/auth/actions/commands/process_social_auth_callback_command'
import { RefreshSessionTokenCommand } from '#modules/auth/actions/commands/refresh_session_token_command'
import { AuthEventIdentityGenerator } from '#modules/auth/actions/ports/outbound/auth_event_identity_generator'
import { AuthLogoutEventPublisher } from '#modules/auth/actions/ports/outbound/auth_logout_event_publisher'
import { AuthOrganizationMembershipReader } from '#modules/auth/actions/ports/outbound/auth_organization_membership_reader'
import { AuthSessionIdentityReader } from '#modules/auth/actions/ports/outbound/auth_session_identity_reader'
import { AuthSessionObservationStager } from '#modules/auth/actions/ports/outbound/auth_session_observation_stager'
import { AuthSessionTokenStore } from '#modules/auth/actions/ports/outbound/auth_session_token_store'
import { AuthSystemAccessReader } from '#modules/auth/actions/ports/outbound/auth_system_access_reader'
import { AuthWebSessionUserReader } from '#modules/auth/actions/ports/outbound/auth_web_session_user_reader'
import { SocialAuthCallbackReader } from '#modules/auth/actions/ports/outbound/social_auth_callback_reader'
import { SocialLoginIdentityPersistence } from '#modules/auth/actions/ports/outbound/social_login_identity_persistence'
import { SocialLoginPersistence } from '#modules/auth/actions/ports/outbound/social_login_persistence'
import { VerifySessionAccessTokenQuery } from '#modules/auth/actions/queries/verify_session_access_token_query'
import { SocialAuthTransportConfigurator } from '#modules/auth/controllers/ports/social_auth_transport_configurator'
import { AdonisSocialAuthTransportConfigurator } from '#modules/auth/infra/oauth/adonis_social_auth_transport_configurator'
import {
  AuthorizationOrganizationAccessReader,
  configureAuthorizationOrganizationAccessReader,
} from '#modules/authorization/actions/ports/outbound/authorization_organization_access_reader'
import {
  AuthorizationUserIdentityReader,
  configureAuthorizationUserIdentityReader,
} from '#modules/authorization/actions/ports/outbound/authorization_user_identity_reader'

export default class IdentityConsumerPortsProvider {
  constructor(private readonly app: ApplicationService) {}

  register(): void {
    const users = userIdentityReader
    const authorizationUserIdentityReader = new AuthorizationUserIdentityReaderAdapter(users)
    const authorizationOrganizationAccessReader =
      new OrganizationsAuthorizationAccessReaderAdapter()
    this.app.container.singleton(AuthSessionIdentityReader, () => authSessionIdentityReader)
    this.app.container.singleton(AuthWebSessionUserReader, () => authWebSessionUserReader)
    this.app.container.singleton(
      AuthorizationUserIdentityReader,
      () => authorizationUserIdentityReader
    )
    this.app.container.singleton(
      AuthorizationOrganizationAccessReader,
      () => authorizationOrganizationAccessReader
    )
    this.app.container.singleton(IssueSessionTokenCommand, () => issueSessionTokenCommand)
    this.app.container.singleton(RefreshSessionTokenCommand, () => refreshSessionTokenCommand)
    this.app.container.singleton(VerifySessionAccessTokenQuery, () => verifySessionAccessTokenQuery)
    this.app.container.singleton(AuthSessionTokenStore, () => authSessionTokenStore)
    this.app.container.singleton(
      AuthOrganizationMembershipReader,
      () => authOrganizationMembershipReader
    )
    this.app.container.singleton(AuthSystemAccessReader, () => authSystemAccessReader)
    this.app.container.singleton(AuthSessionObservationStager, () => authSessionObservationStager)
    this.app.container.singleton(AuthLogoutEventPublisher, () => authLogoutEventPublisher)
    this.app.container.singleton(AuthEventIdentityGenerator, () => authEventIdentityGenerator)
    this.app.container.singleton(LogoutUserCommand, () => logoutUserCommand)
    this.app.container.singleton(
      SocialAuthTransportConfigurator,
      () => new AdonisSocialAuthTransportConfigurator()
    )
    this.app.container.singleton(SocialAuthCallbackReader, () => socialAuthCallbackReader)
    this.app.container.singleton(
      SocialLoginIdentityPersistence,
      () => socialLoginIdentityPersistence
    )
    this.app.container.singleton(SocialLoginPersistence, () => socialLoginPersistence)
    this.app.container.singleton(
      ProcessSocialAuthCallbackCommand,
      () => processSocialAuthCallbackCommand
    )
    configureAuthorizationUserIdentityReader(authorizationUserIdentityReader)
    configureAuthorizationOrganizationAccessReader(authorizationOrganizationAccessReader)
  }
}
