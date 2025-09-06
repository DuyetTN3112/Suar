# cache Backend Module

## Module Path

```text
app/modules/cache
```

## Folder And File Inventory

```text
./ README.md
events/ cache_events.ts
infra/ cache_service.ts single_flight_service.ts
listeners/ cache_invalidation_listener.ts
public_contracts/ cache_store.ts
```

## Route Evidence

```text
(none)
```

## Symbol Evidence

| Kind | Symbol | File | Line |
|---|---|---|---:|
| interface | `CacheInvalidationEvent` | `app/modules/cache/events/cache_events.ts` | 1 |
| function | `isInFlight` | `app/modules/cache/infra/single_flight_service.ts` | 63 |
| function | `getInFlightCount` | `app/modules/cache/infra/single_flight_service.ts` | 72 |
| function | `clear` | `app/modules/cache/infra/single_flight_service.ts` | 79 |
| const | `cacheStore` | `app/modules/cache/public_contracts/cache_store.ts` | 4 |
| const | `singleFlight` | `app/modules/cache/public_contracts/cache_store.ts` | 5 |

## Import Evidence


## Code Snippets

### `app/modules/cache/public_contracts/cache_store.ts`

```ts
import cacheService, { del } from '#modules/cache/infra/cache_service'
import singleFlightService from '#modules/cache/infra/single_flight_service'

export const cacheStore = cacheService
export const singleFlight = singleFlightService
export { del }

```
