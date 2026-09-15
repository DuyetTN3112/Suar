/**
 * Domain Event Outbox Failure and Recovery Test Suite Aggregator
 *
 * Deconstructed following Clean Code and SOLID principles:
 * - domain_event_outbox_staging_dedupe.spec.ts: Transaction rollbacks, deduplication, conflict protection
 * - domain_event_outbox_leases_ordering.spec.ts: Concurrent claimants, sequential aggregate ordering, worker retries
 * - domain_event_outbox_dead_letter_retry.spec.ts: Dead lettering, lease extensions, error sanitization, malformed payload handling
 */

import './domain_event_outbox_staging_dedupe.spec.js'
import './domain_event_outbox_leases_ordering.spec.js'
import './domain_event_outbox_dead_letter_retry.spec.js'
