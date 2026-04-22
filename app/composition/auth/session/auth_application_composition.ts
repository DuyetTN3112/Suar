import redis from '@adonisjs/redis/services/main'

import { AdonisAuthLogoutEventPublisherAdapter } from '#composition/adapters/auth/session/adonis_auth_logout_event_publisher_adapter'
import { AuditAuthSessionEvidenceWriterAdapter } from '#composition/adapters/audit/audit_auth_session_evidence_writer_adapter'
import { AuthSessionIdentityReaderAdapter } from '#composition/adapters/auth/session/auth_session_identity_reader_adapter'
import { AuthWebSessionUserReaderAdapter } from '#composition/adapters/auth/session/auth_web_session_user_reader_adapter'
import { AuthorizationAuthSystemAccessReaderAdapter } from '#composition/adapters/authorization/authorization_auth_system_access_reader_adapter'
import { DurableAuthSessionObservationStagerAdapter } from '#composition/adapters/auth/session/durable_auth_session_observation_stager_adapter'
import { LucidAuthSessionEvidenceTransactionRunner } from '#composition/adapters/auth/session/lucid_auth_session_evidence_transaction_runner'
import { OrganizationsAuthMembershipReaderAdapter } from '#composition/organizations/access/adapters/organizations_auth_membership_reader_adapter'
import { SocialLoginIdentityPersistenceAdapter } from '#composition/adapters/auth/social-login/social_login_identity_persistence_adapter'
import { SocialWebSessionLoginAdapter } from '#composition/adapters/auth/social-login/social_web_session_login_adapter'
import { SystemAuthEventIdentityGeneratorAdapter } from '#composition/adapters/auth/session/system_auth_event_identity_generator_adapter'

import {
  userIdentityReader,
  userSocialLoginIdentityPersistence,
} from '#composition/users/user-application/user_application_composition'
import { IssueSessionTokenCommand } from '#modules/auth/actions/commands/session-management/issue_session_token_command'
import LogoutUserCommand from '#modules/auth/actions/commands/session-management/logout_user_command'
import ProcessAuthSessionObservedCommand from '#modules/auth/actions/commands/session-management/process_auth_session_observed_command'
import ProcessSocialAuthCallbackCommand from '#modules/auth/actions/commands/social-auth/process_social_auth_callback_command'
import { RefreshSessionTokenCommand } from '#modules/auth/actions/commands/session-management/refresh_session_token_command'
import SocialLoginCommand from '#modules/auth/actions/commands/social-auth/social_login_command'
import { ResolveAuthLandingQuery } from '#modules/auth/actions/queries/session-management/resolve_auth_landing_query'
import { VerifySessionAccessTokenQuery } from '#modules/auth/actions/queries/session-management/verify_session_access_token_query'
import LucidSocialLoginPersistenceAdapter from '#modules/auth/infra/adapters/social-auth/lucid_social_login_persistence_adapter'
import SocialAuthCallbackReaderAdapter from '#modules/auth/infra/adapters/social-auth/social_auth_callback_reader_adapter'
import { authSessionEventReceiptRepository } from '#modules/auth/infra/repositories/session-management/auth_session_event_receipt_repository'
import { RedisAuthSessionTokenStore } from '#modules/auth/infra/adapters/session-management/redis_auth_session_token_store'

const users = userIdentityReader

export const authSessionIdentityReader = new AuthSessionIdentityReaderAdapter(users)
export const authWebSessionUserReader = new AuthWebSessionUserReaderAdapter()
export const authOrganizationMembershipReader = new OrganizationsAuthMembershipReaderAdapter()
export const authSystemAccessReader = new AuthorizationAuthSystemAccessReaderAdapter()
export const socialLoginIdentityPersistence = new SocialLoginIdentityPersistenceAdapter(
  userSocialLoginIdentityPersistence
)
export const socialLoginPersistence = new LucidSocialLoginPersistenceAdapter(
  socialLoginIdentityPersistence
)
export const socialLoginCommand = new SocialLoginCommand(
  socialLoginPersistence,
  authSystemAccessReader,
  authOrganizationMembershipReader
)
export const resolveAuthLandingQuery = new ResolveAuthLandingQuery(
  authSystemAccessReader,
  authOrganizationMembershipReader
)
export const socialAuthCallbackReader = new SocialAuthCallbackReaderAdapter()
export const authSessionTokenStore = new RedisAuthSessionTokenStore(() => redis)
export const issueSessionTokenCommand = new IssueSessionTokenCommand(
  authSessionTokenStore,
  authOrganizationMembershipReader,
  authSystemAccessReader
)
export const refreshSessionTokenCommand = new RefreshSessionTokenCommand(
  authSessionTokenStore,
  authSessionIdentityReader,
  authOrganizationMembershipReader,
  authSystemAccessReader
)
export const verifySessionAccessTokenQuery = new VerifySessionAccessTokenQuery(
  authSessionTokenStore,
  authSessionIdentityReader,
  authOrganizationMembershipReader,
  authSystemAccessReader
)
export const socialWebSessionLogin = new SocialWebSessionLoginAdapter()
export const authSessionObservationStager = new DurableAuthSessionObservationStagerAdapter()
export const authLogoutEventPublisher = new AdonisAuthLogoutEventPublisherAdapter()
export const authEventIdentityGenerator = new SystemAuthEventIdentityGeneratorAdapter()
export const logoutUserCommand = new LogoutUserCommand(
  {
    stageEvidence: (observation) => authSessionObservationStager.stage(observation),
    publishLogout: (event) => authLogoutEventPublisher.publish(event),
  },
  authEventIdentityGenerator
)
export const processSocialAuthCallbackCommand = new ProcessSocialAuthCallbackCommand(
  socialAuthCallbackReader,
  socialLoginCommand,
  socialWebSessionLogin,
  authSessionObservationStager,
  authEventIdentityGenerator
)
export const authSessionEvidenceTransactionRunner = new LucidAuthSessionEvidenceTransactionRunner()
export const authSessionAuditEvidenceWriter = new AuditAuthSessionEvidenceWriterAdapter()
export const processAuthSessionObservedCommand = new ProcessAuthSessionObservedCommand({
  transactions: authSessionEvidenceTransactionRunner,
  receipts: authSessionEventReceiptRepository,
  audit: authSessionAuditEvidenceWriter,
})
