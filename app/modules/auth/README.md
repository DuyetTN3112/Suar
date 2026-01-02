# Auth Backend Module

Auth owns authentication policy and authentication workflows. It does not own the Users
aggregate, organization membership, system authorization, Redis, Lucid, Adonis sessions, or
provider SDKs. Those capabilities enter Auth through consumer-owned ports and outer composition.

## Layer ownership

```text
controllers / middleware / listeners
                 |
                 v
              actions
          /               \
         v                 v
      domain         outbound ports
                            |
                            v
                 infra / composition adapters
```

### `domain`

Technology-free Auth business rules:

- supported social-auth providers;
- normalization and validation of social identities;
- semantic post-login landing selection;
- active-session and organization-binding policy;
- privacy-safe login/logout evidence projection.

Domain policy selects semantic outcomes. HTTP paths, Redis keys, SQL transactions, Adonis
contexts, and provider driver behavior do not belong here.

### `actions`

Commands and application services orchestrate domain rules and outbound ports:

- process OAuth callbacks and social login;
- resolve semantic landing outcomes to application navigation paths;
- issue, refresh, verify, and revoke session tokens;
- stage durable login/logout observations;
- publish logout effects.

No Auth action may import Auth infrastructure, Lucid, Redis, Adonis, bootstrap, or outer
composition.

### `infra`

Auth-owned technology implementations:

- OAuth provider-driver adapter;
- OAuth identity persistence and model;
- Redis token storage and atomic refresh rotation;
- durable auth-session receipt persistence.

### `app/composition`

Cross-module and framework wiring:

- Users identity and web-session adapters;
- Organizations membership adapter;
- Authorization system-access adapter;
- durable outbox/audit/activity adapters;
- Adonis event publishing and event identity generation;
- application singleton construction and container bindings.

## Enforced boundary

Run:

```text
pnpm run check:arch:backend:auth-layers
```

The guard fails if required Auth domain policies disappear, Auth actions import technology or
Auth infrastructure, listeners perform infrastructure work, controllers bypass the application
boundary, or public contracts expose Auth implementation.
