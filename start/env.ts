/*
|--------------------------------------------------------------------------
| Environment variables service
|--------------------------------------------------------------------------
|
| The `Env.create` method creates an instance of the Env service. The
| service validates the environment variables and also cast values
| to JavaScript data types.
|
*/

import { Env } from '@adonisjs/core/env'

export default await Env.create(new URL('../', import.meta.url), {
  NODE_ENV: Env.schema.enum(['development', 'production', 'test'] as const),
  PORT: Env.schema.number(),
  APP_URL: Env.schema.string(),
  APP_KEY: Env.schema.string(),
  HOST: Env.schema.string({ format: 'host' }),
  LOG_LEVEL: Env.schema.enum(['error', 'warn', 'info', 'debug', 'trace', 'silent'] as const),

  /*
  |----------------------------------------------------------
  | Variables for configuring session package
  |----------------------------------------------------------
  */
  SESSION_DRIVER: Env.schema.enum(['cookie', 'file', 'redis', 'memory'] as const),

  /*
  |----------------------------------------------------------
  | Variables for PostgreSQL connection
  |----------------------------------------------------------
  */
  PG_HOST: Env.schema.string.optional(),
  PG_PORT: Env.schema.number.optional(),
  PG_USER: Env.schema.string.optional(),
  PG_PASSWORD: Env.schema.string.optional(),
  PG_DATABASE: Env.schema.string.optional(),
  PG_TEST_DATABASE: Env.schema.string.optional(),
  PG_CONNECTION_TIMEOUT_MS: Env.schema.number.optional(),
  PG_POOL_ACQUIRE_TIMEOUT_MS: Env.schema.number.optional(),
  PG_POOL_CREATE_TIMEOUT_MS: Env.schema.number.optional(),
  PG_STATEMENT_TIMEOUT_MS: Env.schema.number.optional(),
  PG_QUERY_TIMEOUT_MS: Env.schema.number.optional(),

  AUDIT_STORE: Env.schema.string.optional(),
  NOTIFICATION_STORE: Env.schema.string.optional(),
  DOMAIN_EVENT_DLQ_SERVICE_PRINCIPAL_ID: Env.schema.string.optional(),
  DOMAIN_EVENT_OUTBOX_RETENTION_SERVICE_PRINCIPAL_ID: Env.schema.string.optional(),
  ERROR_EVENT_RETENTION_SERVICE_PRINCIPAL_ID: Env.schema.string.optional(),
  NOTIFICATION_RETENTION_SERVICE_PRINCIPAL_ID: Env.schema.string.optional(),
  ERROR_EVENT_RETENTION_DAYS: Env.schema.number.optional(),
  ERROR_EVENT_RETENTION_BATCH_SIZE: Env.schema.number.optional(),
  ERROR_EVENT_INSERT_TIMEOUT_MS: Env.schema.number.optional(),
  ERROR_EVENT_MAX_IN_FLIGHT: Env.schema.number.optional(),
  ERROR_EVENT_CIRCUIT_OPEN_MS: Env.schema.number.optional(),
  ERROR_EVENT_SHUTDOWN_DRAIN_MS: Env.schema.number.optional(),
  DOMAIN_EVENT_OUTBOX_PROCESSED_RETENTION_DAYS: Env.schema.number.optional(),
  DOMAIN_EVENT_OUTBOX_REPLAY_HISTORY_RETENTION_DAYS: Env.schema.number.optional(),
  DOMAIN_EVENT_OUTBOX_RETENTION_BATCH_SIZE: Env.schema.number.optional(),

  /*
  |----------------------------------------------------------
  | Variables for configuring Redis connection
  |----------------------------------------------------------
  */
  REDIS_HOST: Env.schema.string({ format: 'host' }),
  REDIS_PORT: Env.schema.number(),
  REDIS_USERNAME: Env.schema.string.optional(),
  REDIS_PASSWORD: Env.schema.string.optional(),
  REDIS_DB: Env.schema.number.optional(),
  REDIS_TEST_HOST: Env.schema.string.optional({ format: 'host' }),
  REDIS_TEST_PORT: Env.schema.number.optional(),
  REDIS_TEST_USERNAME: Env.schema.string.optional(),
  REDIS_TEST_PASSWORD: Env.schema.string.optional(),
  REDIS_TEST_DB: Env.schema.number.optional(),
  REDIS_TLS_ENABLED: Env.schema.boolean.optional(),
  REDIS_CACHE_HOST: Env.schema.string.optional({ format: 'host' }),
  REDIS_CACHE_PORT: Env.schema.number.optional(),
  REDIS_CACHE_USERNAME: Env.schema.string.optional(),
  REDIS_CACHE_PASSWORD: Env.schema.string.optional(),
  REDIS_CACHE_DB: Env.schema.number.optional(),
  REDIS_CACHE_TEST_HOST: Env.schema.string.optional({ format: 'host' }),
  REDIS_CACHE_TEST_PORT: Env.schema.number.optional(),
  REDIS_CACHE_TEST_USERNAME: Env.schema.string.optional(),
  REDIS_CACHE_TEST_PASSWORD: Env.schema.string.optional(),
  REDIS_CACHE_TEST_DB: Env.schema.number.optional(),
  REDIS_CACHE_TLS_ENABLED: Env.schema.boolean.optional(),
  REDIS_CONNECT_TIMEOUT_MS: Env.schema.number.optional(),
  REDIS_COMMAND_TIMEOUT_MS: Env.schema.number.optional(),
  REDIS_MAX_RETRIES_PER_REQUEST: Env.schema.number.optional(),
  CACHE_DEPENDENCY_FAILURE_LOG_INTERVAL_MS: Env.schema.number.optional(),
  REDIS_MAIN_MEMORY_WARN: Env.schema.string.optional(),
  REDIS_MAIN_MEMORY_FAIL: Env.schema.string.optional(),
  REDIS_CACHE_MEMORY_WARN: Env.schema.string.optional(),
  REDIS_CACHE_MEMORY_FAIL: Env.schema.string.optional(),
  CACHE_GENERATION_CONTROL_TTL_SECONDS: Env.schema.number.optional(),
  CACHE_ADMIN_API_ENABLED: Env.schema.boolean.optional(),
  CACHE_ADMIN_BREAK_GLASS_TOKEN: Env.schema.string.optional(),
  LIMITER_STORE: Env.schema.enum.optional(['memory', 'redis'] as const),
  TRANSMIT_REDIS_ENABLED: Env.schema.boolean.optional(),
  TRANSMIT_PING_INTERVAL_MS: Env.schema.number.optional(),
  TRANSMIT_MAX_CONNECTIONS_PER_USER: Env.schema.number.optional(),
  TRANSMIT_MAX_BUFFERED_EVENTS: Env.schema.number.optional(),
  TRANSMIT_MAX_CONNECTION_AGE_MS: Env.schema.number.optional(),

  /*
  |----------------------------------------------------------
  | Variables for configuring the mail package
  |----------------------------------------------------------
  */
  SMTP_HOST: Env.schema.string.optional(),
  SMTP_PORT: Env.schema.string.optional(),
  SMTP_USERNAME: Env.schema.string.optional(),
  SMTP_PASSWORD: Env.schema.string.optional(),
  MAIL_FROM: Env.schema.string.optional(),

  /*
  |----------------------------------------------------------
  | Variables for configuring the application
  |----------------------------------------------------------
  */
  APP_NAME: Env.schema.string(),
  APP_LOGO: Env.schema.string.optional(),
  APP_LOCALE: Env.schema.string(),
  APP_TIMEZONE: Env.schema.string(),

  /*
  |----------------------------------------------------------
  | Variables for configuring ally package
  |----------------------------------------------------------
  */
  // FIX: Optional — cho phép deploy không có OAuth (disable social login)
  GOOGLE_CLIENT_ID: Env.schema.string.optional(),
  GOOGLE_CLIENT_SECRET: Env.schema.string.optional(),
  /*
  |----------------------------------------------------------
  | Variables for configuring ally package
  |----------------------------------------------------------
  */
  GITHUB_CLIENT_ID: Env.schema.string.optional(),
  GITHUB_CLIENT_SECRET: Env.schema.string.optional(),
  SOCIAL_AUTH_PROVIDER_TIMEOUT_MS: Env.schema.number.optional(),

  /*
  |----------------------------------------------------------
  | Variables for configuring the lock package
  |----------------------------------------------------------
  */
  LOCK_STORE: Env.schema.enum(['redis', 'memory'] as const),

  /*
  |----------------------------------------------------------
  | Variables for configuring Elasticsearch search
  |----------------------------------------------------------
  */
  ELASTICSEARCH_ENABLED: Env.schema.boolean.optional(),
  ELASTICSEARCH_NODE: Env.schema.string.optional(),
  ELASTICSEARCH_USERNAME: Env.schema.string.optional(),
  ELASTICSEARCH_PASSWORD: Env.schema.string.optional(),
  ELASTICSEARCH_INDEX_PREFIX: Env.schema.string.optional(),
  ELASTICSEARCH_REQUEST_TIMEOUT_MS: Env.schema.number.optional(),
  ELASTICSEARCH_MAX_RETRIES: Env.schema.number.optional(),
  SEARCH_DISCOVERY_CURSOR_SECRET: Env.schema.string.optional(),
  SKILL_TAXONOMY_CURSOR_SECRET: Env.schema.string.optional(),
  SEARCH_DISCOVERY_CURSOR_TTL_MS: Env.schema.number.optional(),
  ELASTICSEARCH_ADMIN_ENABLED: Env.schema.boolean.optional(),
  ELASTICSEARCH_ADMIN_API_KEY: Env.schema.string.optional(),
  ELASTICSEARCH_ADMIN_USERNAME: Env.schema.string.optional(),
  ELASTICSEARCH_ADMIN_PASSWORD: Env.schema.string.optional(),
  SEARCH_INDEX_ADMIN_SERVICE_PRINCIPAL_ID: Env.schema.string.optional(),
  ELASTICSEARCH_ADMIN_ALLOW_UNVERIFIED_ROLLBACK: Env.schema.boolean.optional(),

  HTTP_KEEP_ALIVE_TIMEOUT_MS: Env.schema.number.optional(),
  HTTP_HEADERS_TIMEOUT_MS: Env.schema.number.optional(),
  HTTP_REQUEST_TIMEOUT_MS: Env.schema.number.optional(),
  HTTP_SOCKET_TIMEOUT_MS: Env.schema.number.optional(),

  /*
  |----------------------------------------------------------
  | Notification Center durable outbox worker
  |----------------------------------------------------------
  */
  NOTIFICATION_OUTBOX_BATCH_SIZE: Env.schema.number.optional(),
  NOTIFICATION_OUTBOX_CONCURRENCY: Env.schema.number.optional(),
  NOTIFICATION_OUTBOX_LEASE_MS: Env.schema.number.optional(),
  NOTIFICATION_OUTBOX_HEARTBEAT_MS: Env.schema.number.optional(),
  NOTIFICATION_OUTBOX_HANDLER_DEADLINE_MS: Env.schema.number.optional(),
  NOTIFICATION_OUTBOX_MAX_ATTEMPTS: Env.schema.number.optional(),
  NOTIFICATION_OUTBOX_RETRY_BASE_MS: Env.schema.number.optional(),
  NOTIFICATION_OUTBOX_RETRY_CAP_MS: Env.schema.number.optional(),
  NOTIFICATION_OUTBOX_POLL_MS: Env.schema.number.optional(),
  NOTIFICATION_FANOUT_MAX_TARGETS: Env.schema.number.optional(),
  NOTIFICATION_FANOUT_BATCH_SIZE: Env.schema.number.optional(),
  NOTIFICATION_FANOUT_CONCURRENCY: Env.schema.number.optional(),
  NOTIFICATION_FANOUT_LEASE_MS: Env.schema.number.optional(),
  NOTIFICATION_FANOUT_MAX_ATTEMPTS: Env.schema.number.optional(),
  NOTIFICATION_FANOUT_RETRY_BASE_MS: Env.schema.number.optional(),
  NOTIFICATION_FANOUT_RETRY_CAP_MS: Env.schema.number.optional(),
  NOTIFICATION_FANOUT_POLL_MS: Env.schema.number.optional(),
  NOTIFICATION_PIPELINE_WARN_AGE_SECONDS: Env.schema.number.optional(),
  NOTIFICATION_PIPELINE_FAIL_AGE_SECONDS: Env.schema.number.optional(),
  NOTIFICATION_PIPELINE_WARN_PENDING: Env.schema.number.optional(),
  NOTIFICATION_PIPELINE_FAIL_PENDING: Env.schema.number.optional(),
  NOTIFICATION_RETENTION_BATCH_SIZE: Env.schema.number.optional(),
  NOTIFICATION_FEED_READ_MODE: Env.schema.enum.optional([
    'postgres',
    'shadow',
    'elasticsearch',
  ] as const),
  NOTIFICATION_FEED_FALLBACK_ENABLED: Env.schema.boolean.optional(),
  NOTIFICATION_FEED_FALLBACK_MAX_CONCURRENT: Env.schema.number.optional(),
  NOTIFICATION_FEED_FALLBACK_GLOBAL_MAX_CONCURRENT: Env.schema.number.optional(),
  NOTIFICATION_FEED_FALLBACK_ADMISSION_LEASE_MS: Env.schema.number.optional(),
  NOTIFICATION_FEED_CURSOR_SECRET: Env.schema.string.optional(),
  NOTIFICATION_FEED_CURSOR_KEY_ID: Env.schema.string.optional(),
  NOTIFICATION_FEED_CURSOR_PREVIOUS_KEYS: Env.schema.string.optional(),
  NOTIFICATION_FEED_CURSOR_TTL_MS: Env.schema.number.optional(),
  NOTIFICATION_FEED_CIRCUIT_FAILURE_THRESHOLD: Env.schema.number.optional(),
  NOTIFICATION_FEED_CIRCUIT_OPEN_MS: Env.schema.number.optional(),
  NOTIFICATION_FEED_SHADOW_LAG_ALLOWANCE_MS: Env.schema.number.optional(),
  NOTIFICATION_FEED_SHADOW_SAMPLE_RATE: Env.schema.number.optional(),
  NOTIFICATION_PROJECTION_ROLLBACK_WINDOW_MS: Env.schema.number.optional(),
  NOTIFICATION_UNREAD_CACHE_TTL_SECONDS: Env.schema.number.optional(),

  /*
  |----------------------------------------------------------
  | Durable cache-invalidation outbox worker
  |----------------------------------------------------------
  */
  CACHE_INVALIDATION_OUTBOX_BATCH_SIZE: Env.schema.number.optional(),
  CACHE_INVALIDATION_OUTBOX_CONCURRENCY: Env.schema.number.optional(),
  CACHE_INVALIDATION_OUTBOX_LEASE_MS: Env.schema.number.optional(),
  CACHE_INVALIDATION_OUTBOX_HEARTBEAT_MS: Env.schema.number.optional(),
  CACHE_INVALIDATION_OUTBOX_MAX_ATTEMPTS: Env.schema.number.optional(),
  CACHE_INVALIDATION_OUTBOX_RETRY_BASE_MS: Env.schema.number.optional(),
  CACHE_INVALIDATION_OUTBOX_RETRY_CAP_MS: Env.schema.number.optional(),
  CACHE_INVALIDATION_OUTBOX_POLL_MS: Env.schema.number.optional(),
  CACHE_INVALIDATION_OUTBOX_RETENTION_DAYS: Env.schema.number.optional(),
  CACHE_INVALIDATION_OUTBOX_WARN_AGE_SECONDS: Env.schema.number.optional(),
  CACHE_INVALIDATION_OUTBOX_FAIL_AGE_SECONDS: Env.schema.number.optional(),

  /*
  |----------------------------------------------------------
  | Durable domain-event outbox worker
  |----------------------------------------------------------
  */
  DOMAIN_EVENT_OUTBOX_BATCH_SIZE: Env.schema.number.optional(),
  DOMAIN_EVENT_OUTBOX_CONCURRENCY: Env.schema.number.optional(),
  DOMAIN_EVENT_OUTBOX_LEASE_MS: Env.schema.number.optional(),
  DOMAIN_EVENT_OUTBOX_HEARTBEAT_MS: Env.schema.number.optional(),
  DOMAIN_EVENT_OUTBOX_HANDLER_DEADLINE_MS: Env.schema.number.optional(),
  DOMAIN_EVENT_OUTBOX_MAX_ATTEMPTS: Env.schema.number.optional(),
  DOMAIN_EVENT_OUTBOX_RETRY_BASE_MS: Env.schema.number.optional(),
  DOMAIN_EVENT_OUTBOX_RETRY_CAP_MS: Env.schema.number.optional(),
  DOMAIN_EVENT_OUTBOX_POLL_MS: Env.schema.number.optional(),

  /*
  |----------------------------------------------------------
  | Durable domain-event outbox health objectives
  |----------------------------------------------------------
  */
  DOMAIN_EVENT_OUTBOX_WARN_DUE_PENDING: Env.schema.number.optional(),
  DOMAIN_EVENT_OUTBOX_FAIL_DUE_PENDING: Env.schema.number.optional(),
  DOMAIN_EVENT_OUTBOX_WARN_DUE_AGE_SECONDS: Env.schema.number.optional(),
  DOMAIN_EVENT_OUTBOX_FAIL_DUE_AGE_SECONDS: Env.schema.number.optional(),
  DOMAIN_EVENT_OUTBOX_FAIL_EXPIRED_LEASE_AGE_SECONDS: Env.schema.number.optional(),

  /*
  |----------------------------------------------------------
  | Clawagent AI dispute trigger
  |----------------------------------------------------------
  */
  CLAWAGENT_API_URL: Env.schema.string.optional(),
  CLAWAGENT_REQUEST_TIMEOUT_MS: Env.schema.number.optional(),
  CLAWAGENT_MAX_DIAGNOSTIC_BYTES: Env.schema.number.optional(),
  CLAWAGENT_TRIGGER_MAX_ATTEMPTS: Env.schema.number.optional(),
  CLAWAGENT_TRIGGER_RETRY_BASE_MS: Env.schema.number.optional(),
  CLAWAGENT_TRIGGER_RETRY_CAP_MS: Env.schema.number.optional(),
  CLAWAGENT_TRIGGER_STALE_DISPATCH_MS: Env.schema.number.optional(),
  CLAWAGENT_TRIGGER_BATCH_SIZE: Env.schema.number.optional(),
  CLAWAGENT_TRIGGER_POLL_MS: Env.schema.number.optional(),
  SUAR_CALLBACK_URL: Env.schema.string.optional(),
  SUAR_DISPUTE_API_KEY: Env.schema.string.optional(),
  DEVPORTAL_API_KEY_SECRET: Env.schema.string.optional(),

  /*
  |----------------------------------------------------------
  | Variables for health check API key
  | Dùng bởi api_key_middleware.ts — BẮT BUỘC để bảo vệ /health endpoint
  | Nếu không set, health endpoint sẽ bị chặn (secure by default)
  |----------------------------------------------------------
  */
  HEALTH_CHECK_API_KEY: Env.schema.string.optional(),
  METRICS_API_KEY: Env.schema.string.optional(),
  TESTING_ROUTES_API_KEY: Env.schema.string.optional(),
})
