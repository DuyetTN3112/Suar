import redis from '@adonisjs/redis/services/main'

import { AdonisAuthLogoutEventPublisherAdapter } from './adapters/adonis_auth_logout_event_publisher_adapter.js'
import { AuditAuthSessionEvidenceWriterAdapter } from './adapters/audit_auth_session_evidence_writer_adapter.js'
import { AuthSessionIdentityReaderAdapter } from './adapters/auth_session_identity_reader_adapter.js'
import { AuthWebSessionUserReaderAdapter } from './adapters/auth_web_session_user_reader_adapter.js'
import { AuthorizationAuthSystemAccessReaderAdapter } from './adapters/authorization_auth_system_access_reader_adapter.js'
import { DurableAuthSessionObservationStagerAdapter } from './adapters/durable_auth_session_observation_stager_adapter.js'
import { LucidAuthSessionEvidenceTransactionRunner } from './adapters/lucid_auth_session_evidence_transaction_runner.js'
import { OrganizationsAuthMembershipReaderAdapter } from './adapters/organizations_auth_membership_reader_adapter.js'
import { SocialLoginIdentityPersistenceAdapter } from './adapters/social_login_identity_persistence_adapter.js'
import { SocialWebSessionLoginAdapter } from './adapters/social_web_session_login_adapter.js'
import { SystemAuthEventIdentityGeneratorAdapter } from './adapters/system_auth_event_identity_generator_adapter.js'

import {
  userIdentityReader,
  userSocialLoginIdentityPersistence,
} from '#composition/user_application_composition'
import { IssueSessionTokenCommand } from '#modules/auth/actions/commands/issue_session_token_command'
import LogoutUserCommand from '#modules/auth/actions/commands/logout_user_command'
import ProcessAuthSessionObservedCommand from '#modules/auth/actions/commands/process_auth_session_observed_command'
import ProcessSocialAuthCallbackCommand from '#modules/auth/actions/commands/process_social_auth_callback_command'
import { RefreshSessionTokenCommand } from '#modules/auth/actions/commands/refresh_session_token_command'
import SocialLoginCommand from '#modules/auth/actions/commands/social_login_command'
import { ResolveAuthLandingQuery } from '#modules/auth/actions/queries/resolve_auth_landing_query'
import { VerifySessionAccessTokenQuery } from '#modules/auth/actions/queries/verify_session_access_token_query'
import LucidSocialLoginPersistenceAdapter from '#modules/auth/infra/adapters/lucid_social_login_persistence_adapter'
import SocialAuthCallbackReaderAdapter from '#modules/auth/infra/oauth/social_auth_callback_reader_adapter'
import { authSessionEventReceiptRepository } from '#modules/auth/infra/repositories/auth_session_event_receipt_repository'
import { RedisAuthSessionTokenStore } from '#modules/auth/infra/session/redis_auth_session_token_store'

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
