# logger Backend Module

## Module Path

```text
app/modules/logger
```

## Folder And File Inventory

```text
./ README.md
infra/ auth_logger.ts logger_service.ts
listeners/ lifecycle_log_listener.ts
public_contracts/ auth_logger.ts logger_service.ts
```

## Route Evidence

```text
(none)
```

## Symbol Evidence

| Kind | Symbol | File | Line |
|---|---|---|---:|
| const | `oauthRedirect` | `app/modules/logger/infra/auth_logger.ts` | 58 |
| const | `oauthCallbackStart` | `app/modules/logger/infra/auth_logger.ts` | 72 |
| const | `oauthUserReceived` | `app/modules/logger/infra/auth_logger.ts` | 86 |
| const | `oauthProviderLookup` | `app/modules/logger/infra/auth_logger.ts` | 109 |
| const | `userCreated` | `app/modules/logger/infra/auth_logger.ts` | 118 |
| const | `userLogin` | `app/modules/logger/infra/auth_logger.ts` | 127 |
| const | `oauthError` | `app/modules/logger/infra/auth_logger.ts` | 136 |
| const | `oauthStateError` | `app/modules/logger/infra/auth_logger.ts` | 172 |
| const | `loginAttempt` | `app/modules/logger/infra/auth_logger.ts` | 184 |
| const | `loginFailure` | `app/modules/logger/infra/auth_logger.ts` | 193 |
| const | `dbTransaction` | `app/modules/logger/infra/auth_logger.ts` | 202 |
| const | `configCheck` | `app/modules/logger/infra/auth_logger.ts` | 215 |
| type | `LogLevel` | `app/modules/logger/infra/logger_service.ts` | 13 |
| class | `LoggerService` | `app/modules/logger/infra/logger_service.ts` | 19 |

## Import Evidence


## Code Snippets

### `app/modules/logger/public_contracts/auth_logger.ts`

```ts
export * from '#modules/logger/infra/auth_logger'

```

### `app/modules/logger/public_contracts/logger_service.ts`

```ts
export { default, LoggerService, type LogLevel } from '#modules/logger/infra/logger_service'

```
